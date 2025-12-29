from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import requests

API_KEY = "7f2328330ccbb5c650edf3cd0073278a4a677c83"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/ocr/plate")
async def read_plate(file: UploadFile = File(...)):
    image_bytes = await file.read()

    response = requests.post(
        "https://api.platerecognizer.com/v1/plate-reader/",
        files={"upload": image_bytes},
        headers={"Authorization": f"Token {API_KEY}"}
    )

    data = response.json()

    if "results" not in data or len(data["results"]) == 0:
        return {"success": False, "plate": None}

    plate = data["results"][0]["plate"].upper()

    # Indian formatting
    if len(plate) >= 10:
        plate = f"{plate[0:2]} {plate[2:4]} {plate[4:6]} {plate[6:10]}"

    return {
        "success": True,
        "plate": plate
    }
