"""
BuddyWork Azure Functions API
Endpoints for OCR processing, call number sorting, and task management.

Deploy: func azure functionapp publish buddywork-api

Structure:
  /api/ocr          — Receives shelf photo, returns detected call numbers
  /api/sort          — Receives call numbers, returns correct/misplaced status  
  /api/tasks         — Returns today's task list for a worker
  /api/complete      — Logs task completion
  /api/voice-script  — Generates voice coaching text for a task step
"""

import azure.functions as func
import json
import os
import base64
import logging
from io import BytesIO

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


# ============================================================
# ENDPOINT 1: OCR — Read call numbers from shelf photo
# Shyameati's vision pipeline
# ============================================================

@app.route(route="ocr", methods=["POST"])
def ocr_scan(req: func.HttpRequest) -> func.HttpResponse:
    """
    Receives a base64-encoded shelf photo.
    Returns detected call numbers with bounding box positions.
    
    Input:  { "image": "base64string..." }
    Output: { "books": [{ "callNumber": "FIC ADA", "bounds": {...} }] }
    """
    try:
        body = req.get_json()
        image_base64 = body.get("image", "")
        
        if not image_base64:
            return func.HttpResponse(
                json.dumps({"error": "No image provided"}),
                status_code=400,
                mimetype="application/json"
            )

        # --- Azure AI Vision OCR ---
        from azure.cognitiveservices.vision.computervision import ComputerVisionClient
        from msrest.authentication import CognitiveServicesCredentials

        vision_key = os.environ.get("VISION_KEY")
        vision_endpoint = os.environ.get("VISION_ENDPOINT")

        client = ComputerVisionClient(
            vision_endpoint,
            CognitiveServicesCredentials(vision_key)
        )

        # Decode base64 image
        image_bytes = base64.b64decode(image_base64)
        image_stream = BytesIO(image_bytes)

        # Run OCR
        result = client.read_in_stream(image_stream, raw=True)
        operation_id = result.headers["Operation-Location"].split("/")[-1]

        # Poll for results
        import time
        while True:
            read_result = client.get_read_result(operation_id)
            if read_result.status.lower() not in ["notstarted", "running"]:
                break
            time.sleep(0.5)

        # Extract call numbers from OCR text
        books = []
        if read_result.status.lower() == "succeeded":
            for page in read_result.analyze_result.read_results:
                for line in page.lines:
                    text = line.text.strip().upper()
                    # Filter for call number patterns (e.g., "FIC ADA", "921 SMI")
                    if is_call_number(text):
                        bbox = line.bounding_box
                        # Normalize bounding box to 0-1 range
                        books.append({
                            "callNumber": text,
                            "bounds": {
                                "x": bbox[0] / page.width,
                                "y": bbox[1] / page.height,
                                "width": (bbox[2] - bbox[0]) / page.width,
                                "height": (bbox[5] - bbox[1]) / page.height,
                            },
                            "confidence": line.confidence if hasattr(line, 'confidence') else 0.9
                        })

        return func.HttpResponse(
            json.dumps({"books": books, "total": len(books)}),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"OCR error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


def is_call_number(text: str) -> bool:
    """
    Checks if a text string looks like a library call number.
    Patterns: "FIC ADA", "921 SMI", "J PIC BRO", "DVD FIC", etc.
    """
    import re
    patterns = [
        r'^[A-Z]{1,4}\s+[A-Z]{2,4}',     # FIC ADA, DVD SCI
        r'^\d{3}(\.\d+)?\s+[A-Z]{2,4}',   # 921 SMI, 636.7 BUD
        r'^J\s+[A-Z]{2,4}\s+[A-Z]{2,4}',  # J PIC BRO (juvenile)
        r'^YA\s+[A-Z]{2,4}\s+[A-Z]{2,4}', # YA FIC GRE (young adult)
    ]
    return any(re.match(p, text) for p in patterns)


# ============================================================
# ENDPOINT 2: SORT — Check if call numbers are in order
# Gauransh's sorting engine
# ============================================================

@app.route(route="sort", methods=["POST"])
def sort_check(req: func.HttpRequest) -> func.HttpResponse:
    """
    Receives a list of call numbers in shelf order.
    Returns which are correct and which are misplaced.
    
    Input:  { "callNumbers": ["FIC ADA", "FIC BRA", "FIC HER", "FIC DIC"] }
    Output: {
        "results": [
            { "callNumber": "FIC ADA", "position": 0, "status": "correct" },
            { "callNumber": "FIC HER", "position": 2, "status": "misplaced", "correctPosition": 3 },
            ...
        ],
        "correctCount": 2,
        "misplacedCount": 2
    }
    """
    try:
        body = req.get_json()
        call_numbers = body.get("callNumbers", [])

        if not call_numbers:
            return func.HttpResponse(
                json.dumps({"error": "No call numbers provided"}),
                status_code=400,
                mimetype="application/json"
            )

        # Sort call numbers using library sorting rules
        sorted_numbers = sort_call_numbers(call_numbers)

        # Compare current order with correct order
        results = []
        correct_count = 0
        misplaced_count = 0

        for i, cn in enumerate(call_numbers):
            correct_pos = sorted_numbers.index(cn)
            is_correct = (i == correct_pos)

            result = {
                "callNumber": cn,
                "position": i,
                "status": "correct" if is_correct else "misplaced",
            }

            if not is_correct:
                result["correctPosition"] = correct_pos
                result["shouldBeBefore"] = sorted_numbers[correct_pos - 1] if correct_pos > 0 else None
                result["shouldBeAfter"] = sorted_numbers[correct_pos + 1] if correct_pos < len(sorted_numbers) - 1 else None
                misplaced_count += 1
            else:
                correct_count += 1

            results.append(result)

        return func.HttpResponse(
            json.dumps({
                "results": results,
                "correctCount": correct_count,
                "misplacedCount": misplaced_count,
                "correctOrder": sorted_numbers,
            }),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Sort error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


def sort_call_numbers(call_numbers: list) -> list:
    """
    Sorts library call numbers following standard library rules:
    1. Prefix alphabetically (FIC, J, YA, DVD, then Dewey numbers)
    2. Within same prefix, alphabetically by cutter (author code)
    3. Numeric prefixes sort numerically (921 before 940)
    """
    def call_number_key(cn: str):
        parts = cn.strip().upper().split()
        
        if not parts:
            return (2, "", "")

        # Check if first part is numeric (Dewey)
        try:
            num = float(parts[0])
            # Dewey numbers sort numerically, then by cutter
            cutter = parts[1] if len(parts) > 1 else ""
            return (1, f"{num:010.4f}", cutter)
        except ValueError:
            pass

        # Alphabetic prefixes sort alphabetically
        prefix = parts[0]
        cutter = parts[1] if len(parts) > 1 else ""
        extra = " ".join(parts[2:]) if len(parts) > 2 else ""

        return (0, prefix, cutter + extra)

    return sorted(call_numbers, key=call_number_key)


# ============================================================
# ENDPOINT 3: TASKS — Get today's task list
# ============================================================

@app.route(route="tasks", methods=["GET"])
def get_tasks(req: func.HttpRequest) -> func.HttpResponse:
    """
    Returns today's task list for a worker.
    Query params: workerId (optional, defaults to demo)
    
    Output: { "tasks": [...], "date": "2026-05-20" }
    """
    worker_id = req.params.get("workerId", "demo-worker")

    # For hackathon: return hardcoded task list
    # In production: pull from Cosmos DB based on worker schedule
    tasks = {
        "workerId": worker_id,
        "date": "2026-05-20",
        "tasks": [
            {
                "id": "shelf_scan_1",
                "type": "shelf_scan",
                "title": "Shelf Scan",
                "location": "Aisle 5",
                "section": "Fiction A-F",
                "priority": 1,
                "status": "ready",
                "estimatedMinutes": 15,
                "steps": [
                    {"id": "go", "instruction": "Go to Aisle 5", "icon": "walk"},
                    {"id": "scan", "instruction": "Scan shelf 2", "icon": "camera"},
                    {"id": "fix", "instruction": "Fix any misplaced books", "icon": "swap"},
                ]
            },
            {
                "id": "process_returns_1",
                "type": "process_returns",
                "title": "Process Returns",
                "location": "Circulation Desk",
                "section": "Return Cart",
                "priority": 2,
                "status": "locked",
                "estimatedMinutes": 30,
                "steps": [
                    {"id": "sort", "instruction": "Sort cart by section", "icon": "sort"},
                    {"id": "scan", "instruction": "Scan each item", "icon": "barcode"},
                    {"id": "shelve", "instruction": "Shelve items", "icon": "shelf"},
                ]
            },
            {
                "id": "hold_prep_1",
                "type": "hold_prep",
                "title": "Prepare Holds",
                "location": "Hold Shelf",
                "section": "Patron Pickup",
                "priority": 3,
                "status": "locked",
                "estimatedMinutes": 20,
                "steps": [
                    {"id": "pull", "instruction": "Pull items from shelves", "icon": "search"},
                    {"id": "match", "instruction": "Match to patron slips", "icon": "match"},
                    {"id": "place", "instruction": "Place on hold shelf", "icon": "shelf"},
                ]
            },
            {
                "id": "label_new_1",
                "type": "label_new",
                "title": "Label New Items",
                "location": "Processing Room",
                "section": "New Acquisitions",
                "priority": 4,
                "status": "locked",
                "estimatedMinutes": 25,
                "steps": [
                    {"id": "stamp", "instruction": "Stamp date page", "icon": "stamp"},
                    {"id": "barcode", "instruction": "Apply barcode", "icon": "barcode"},
                    {"id": "spine", "instruction": "Apply spine label", "icon": "label"},
                    {"id": "cover", "instruction": "Apply cover protector", "icon": "cover"},
                ]
            }
        ]
    }

    return func.HttpResponse(
        json.dumps(tasks),
        mimetype="application/json"
    )


# ============================================================
# ENDPOINT 4: COMPLETE — Log task completion
# ============================================================

@app.route(route="complete", methods=["POST"])
def complete_task(req: func.HttpRequest) -> func.HttpResponse:
    """
    Logs that a worker completed a task.
    Updates their streak and progress data.
    
    Input: {
        "workerId": "demo-worker",
        "taskId": "shelf_scan_1",
        "booksChecked": 6,
        "booksFixed": 2,
        "durationSeconds": 240
    }
    """
    try:
        body = req.get_json()

        # For hackathon: just acknowledge
        # In production: write to Cosmos DB, update streaks
        completion = {
            "workerId": body.get("workerId", "demo-worker"),
            "taskId": body.get("taskId"),
            "booksChecked": body.get("booksChecked", 0),
            "booksFixed": body.get("booksFixed", 0),
            "durationSeconds": body.get("durationSeconds", 0),
            "timestamp": "2026-05-20T10:30:00Z",
            "streak": 3,  # hardcoded for demo
            "totalTasksToday": 1,
            "celebrationMessage": "Shelf is correct",
        }

        return func.HttpResponse(
            json.dumps(completion),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Complete error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# ============================================================
# ENDPOINT 5: VOICE SCRIPT — Generate coaching text
# Uses Azure AI Foundry to create adaptive voice instructions
# ============================================================

@app.route(route="voice-script", methods=["POST"])
def voice_script(req: func.HttpRequest) -> func.HttpResponse:
    """
    Generates voice coaching text for a specific task step,
    adapted to the worker's support level.
    
    Input: {
        "taskType": "shelf_scan",
        "stepId": "go_aisle",
        "supportLevel": 2,
        "context": { "aisle": 5, "section": "Fiction A-F" }
    }
    Output: { "voiceText": "Walk to Aisle 5..." }
    """
    try:
        body = req.get_json()
        task_type = body.get("taskType", "shelf_scan")
        step_id = body.get("stepId", "")
        support_level = body.get("supportLevel", 2)
        context = body.get("context", {})

        # For hackathon: return pre-written scripts
        # In production: call Azure AI Foundry for adaptive generation
        
        # Check if we should use AI generation
        use_ai = body.get("useAI", False)
        
        if use_ai and os.environ.get("FOUNDRY_KEY") and os.environ.get("FOUNDRY_ENDPOINT"):
            voice_text = generate_ai_voice_script(
                task_type, step_id, support_level, context
            )
        else:
            voice_text = get_preset_voice_script(
                task_type, step_id, support_level, context
            )

        return func.HttpResponse(
            json.dumps({"voiceText": voice_text, "stepId": step_id}),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Voice script error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


def get_preset_voice_script(task_type, step_id, support_level, context):
    """Pre-written voice scripts by support level."""
    
    scripts = {
        "shelf_scan": {
            "go_aisle": {
                1: f"Aisle {context.get('aisle', 5)}. {context.get('section', 'Fiction')}.",
                2: f"Walk to Aisle {context.get('aisle', 5)} in the {context.get('section', 'Fiction')} section. Look for the number {context.get('aisle', 5)} sign above the shelves.",
                3: f"Let's go to Aisle {context.get('aisle', 5)}. Walk straight ahead past the desks. Look up for a big number {context.get('aisle', 5)}. That is where we are going. Tell me when you see it.",
            },
            "scan_shelf": {
                1: "Scan shelf 2.",
                2: "Point your phone camera at the second shelf from the top. Hold it steady so I can read the labels.",
                3: "Hold your phone up. Point it at the books. Count the shelves from the top. One. Two. Point at shelf two. Hold very still. I will read the labels for you.",
            },
            "fix_books": {
                1: "Swap the flagged items.",
                2: "Two books are in the wrong place. Take them out and put them back in the right order. D comes before H.",
                3: "I found two books in the wrong spot. I will tell you exactly what to do. First, take out the book with the yellow border. Hold it in your hand. I will tell you the next step.",
            },
        }
    }

    task_scripts = scripts.get(task_type, {})
    step_scripts = task_scripts.get(step_id, {})
    return step_scripts.get(support_level, step_scripts.get(2, "Follow the instructions on screen."))


def generate_ai_voice_script(task_type, step_id, support_level, context):
    """Use Azure AI Foundry to generate adaptive voice coaching."""
    
    from openai import AzureOpenAI

    client = AzureOpenAI(
        api_key=os.environ.get("FOUNDRY_KEY"),
        api_version=os.environ.get("FOUNDRY_API_VERSION", "2024-10-21"),
        azure_endpoint=os.environ.get("FOUNDRY_ENDPOINT"),
    )

    level_desc = {
        1: "independent worker who needs minimal guidance, short and direct",
        2: "worker who needs step-by-step guidance, clear and calm",
        3: "worker who needs detailed guidance with very simple language, one action at a time",
    }

    response = client.chat.completions.create(
        model=os.environ.get("FOUNDRY_DEPLOYMENT", "gpt-5-4-mini"),
        messages=[
            {
                "role": "system",
                "content": f"""You are a patient job coach for a library worker.
Generate a voice instruction for the task step.
Support level: {level_desc.get(support_level, level_desc[2])}

Rules:
- Use simple, concrete language
- No enthusiasm or performative praise
- State facts and actions only
- One instruction per sentence
- Short sentences (under 12 words each)
- Never say "great job" or "awesome"
- Be warm but factual
- Maximum 3 sentences for level 1, 5 for level 2, 7 for level 3"""
            },
            {
                "role": "user",
                "content": f"Task: {task_type}, Step: {step_id}, Context: {json.dumps(context)}"
            }
        ],
        max_completion_tokens=150,
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()


# ============================================================
# ENDPOINT 6: CHAT — AI conversation for worker help
# ============================================================

@app.route(route="chat", methods=["POST"])
def chat(req: func.HttpRequest) -> func.HttpResponse:
    """
    AI conversation endpoint for in-task help.

    Input:  { "message": "...", "step": "...", "workerName": "Dylan" }
    Output: { "reply": "..." }
    """
    try:
        body = req.get_json()
        message = body.get("message", "")
        step = body.get("step", "")
        worker_name = body.get("workerName", "Dylan")

        if not message:
            return func.HttpResponse(
                json.dumps({"error": "No message provided"}),
                status_code=400,
                mimetype="application/json"
            )

        # Prefer Azure AI Foundry credentials, fall back to legacy Azure OpenAI
        api_key = os.environ.get("FOUNDRY_KEY") or os.environ.get("OPENAI_KEY")
        endpoint = os.environ.get("FOUNDRY_ENDPOINT") or os.environ.get("OPENAI_ENDPOINT")
        model = os.environ.get("FOUNDRY_DEPLOYMENT") or os.environ.get("FOUNDRY_MODEL", "gpt-4o")

        if not api_key:
            return func.HttpResponse(
                json.dumps({"reply": "I'm here to help. The AI service needs to be configured — ask a supervisor to add the API key."}),
                mimetype="application/json"
            )

        from openai import AzureOpenAI

        client = AzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version="2024-05-01-preview",
        )

        system_prompt = f"""You are BuddyWork, a practical AI job coach helping {worker_name}, an autistic library worker.
    Current task step: {step}

    Primary goal:
    - Help the worker complete real library procedures safely and accurately.
    - Reduce ambiguity and cognitive load while preserving autonomy.

    Known task context (use when relevant):
    - Shelf Scan at Aisle 5, Fiction A-F
    - Books are sorted alphabetically: FIC ADA, FIC BRA, FIC CLA, FIC DIC, FIC HER, FIC LEG
    - FIC HER and FIC DIC are swapped and need to be fixed
    - D comes before H alphabetically

    How to respond:
    - Use clear, concrete language and avoid jargon.
    - Be calm, respectful, and direct. Do not use performative praise.
    - Prefer action-first guidance for in-the-moment help.
    - Give numbered steps for procedures and troubleshooting.
    - Keep answers concise by default, but expand when the worker asks for detail.
    - If the request is unclear, ask one focused clarifying question.
    - If there are multiple valid ways, offer 2-3 options with tradeoffs.
    - If the worker seems overwhelmed, briefly validate and break work into the next smallest step.
    - Include simple checks ("You should see...", "If not, then...") when useful.

    Boundaries:
    - Do not invent library policy details; state assumptions when uncertain.
    - Do not provide legal or medical advice.

    Formatting preference:
    - For quick questions: short direct answer.
    - For procedures: numbered checklist with optional "If stuck" fallback."""

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            max_completion_tokens=220,
            temperature=0.45,
        )

        reply = response.choices[0].message.content.strip()

        return func.HttpResponse(
            json.dumps({"reply": reply}),
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )


# ============================================================
# ENDPOINT 7: WORKER PROFILE — Get/set preferences
# ============================================================

@app.route(route="worker", methods=["GET", "POST"])
def worker_profile(req: func.HttpRequest) -> func.HttpResponse:
    """
    GET: Returns worker profile (support level, celebration pref, etc.)
    POST: Updates worker preferences
    """
    worker_id = req.params.get("workerId", "demo-worker")

    if req.method == "GET":
        # For hackathon: return demo profile
        profile = {
            "workerId": worker_id,
            "name": "Demo Worker",
            "supportLevel": 2,
            "celebrationLevel": "medium",
            "voiceEnabled": True,
            "voiceSpeed": 0.85,
            "reducedMotion": False,
            "breakIntervalMinutes": 45,
            "streak": 3,
            "totalTasksCompleted": 47,
            "startDate": "2026-04-15",
        }
        return func.HttpResponse(
            json.dumps(profile),
            mimetype="application/json"
        )

    elif req.method == "POST":
        try:
            body = req.get_json()
            # In production: update Cosmos DB
            return func.HttpResponse(
                json.dumps({"status": "updated", "workerId": worker_id}),
                mimetype="application/json"
            )
        except Exception as e:
            return func.HttpResponse(
                json.dumps({"error": str(e)}),
                status_code=500,
                mimetype="application/json"
            )
