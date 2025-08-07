const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function logFeatureUsage({
  user_id,
  feature,
  metadata,
}: {
  user_id?: string;
  feature: string;
  metadata?: any;
}) {
  try {
    await fetch(`${API_BASE_URL}/api/log-usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, feature, metadata }),
    });
  } catch (err) {
    // Fallback to console.error if logging fails
    console.error('Failed to log feature usage to backend:', err);
  }
}