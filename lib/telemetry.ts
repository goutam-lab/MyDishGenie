export async function pushLog(data: {
  message: string;
  level: 'info' | 'warn' | 'error';
  latency?: number;
}) {
  const url = process.env.INFRAGUARDIAN_URL;
  const projectId = process.env.INFRAGUARDIAN_PROJECT_ID;

  if (!url || !projectId) return;

  // Move the log inside the function so it has access to 'url'
  console.log("Sending log to:", `${url}/api/ingest`);

  try {
    await fetch(`${url}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        project_id: projectId,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Telemetry failed:", err);
  }
}