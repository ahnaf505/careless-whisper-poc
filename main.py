import sqlite3
import time
import re
import os
from datetime import datetime
import pytz
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

DB_PATH = "latency.db"
CHROME_DIR = os.path.join(os.getcwd(), "chrome-data")

if not os.path.exists(CHROME_DIR):
    os.makedirs(CHROME_DIR)
    print("Created chrome-data directory.")
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS latency_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            received_at TEXT NOT NULL,
            value REAL NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def save_value(ms_value: float):
    local_tz = pytz.timezone("Asia/Jakarta")
    timestamp = datetime.now(local_tz).isoformat(timespec="milliseconds")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO latency_log (received_at, value) VALUES (?, ?)",
        (timestamp, ms_value)
    )
    conn.commit()
    conn.close()
    print(f"Saved: {ms_value} ms at {timestamp}")

init_db()

opts = Options()


opts.add_argument(f"--user-data-dir={CHROME_DIR}")
opts.add_argument("--disable-web-security")
opts.add_argument("--disable-site-isolation-trials")
opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Chrome(options=opts)
driver.get("https://web.whatsapp.com/")

with open("inject.js", "r") as f:
    js_code = f.read()
input("press ENTER to inject js")
driver.execute_script(js_code)
print("Injected custom JS.")

pattern = re.compile(r"time-diff:\s*==([\d.]+)==")

print("Monitoring console...")

while True:
    logs = driver.get_log("browser")
    for entry in logs:
        msg = entry["message"]
        match = pattern.search(msg)
        if match:
            value = float(match.group(1))
            save_value(value)

    time.sleep(0.2)
