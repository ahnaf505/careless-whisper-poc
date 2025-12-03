import sqlite3
import pandas as pd
import matplotlib.pyplot as plt


DB_PATH = "latency.db"

conn = sqlite3.connect(DB_PATH)
df = pd.read_sql_query("""
    SELECT id, received_at, value
    FROM latency_log;
""", conn)
conn.close()

df['received_at'] = pd.to_datetime(df['received_at'])


# --- plot (dots + MA line) ---
df['latency_ms'] = df['value'] / 1000.0
df['ma_ms'] = df['latency_ms'].rolling(window=300).mean()

plt.figure(figsize=(12, 5))
plt.scatter(df['received_at'], df['latency_ms'], s=2)
plt.plot(df['received_at'], df['ma_ms']+300, linewidth=2, color="red")

plt.xlabel("Timestamp")
plt.ylabel("Latency (ms)")
plt.title(f"Latency from {START} to {END}")
plt.tight_layout()
plt.show()
