from fastapi import FastAPI

app = FastAPI(title="Tonalys worker")


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "tonalys-worker"}
