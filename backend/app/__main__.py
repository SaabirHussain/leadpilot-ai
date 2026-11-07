import os

import uvicorn

uvicorn.run(
    "app.main:app",
    host=os.getenv("HOST", "127.0.0.1"),
    port=int(os.getenv("PORT", "8000")),
    access_log=False,
)
