export function renderConsentPage(
	siteName: string,
	originalUrl: string,
	trackingId: string,
	destinationDomain: string,
	redirectDelay: number
  ) {
	const domain = new URL(originalUrl).hostname;

	return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Redirecting to ${domain}</title>
	<style>
	  body {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		margin: 0;
		padding: 0;
		background-color: #f9fafb;
		color: #111827;
	  }

	  .main-content {
		width: 100%;
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
	  }

	  .redirect-message {
		text-align: center;
		margin-bottom: 20px;
	  }

	  .redirect-message h1 {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	  }

	  .destination {
		color: #2563eb;
		font-weight: 600;
	  }

	  .consent-drawer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
		border-top-left-radius: 12px;
		border-top-right-radius: 12px;
		padding: 16px 24px;
		transform: translateY(0);
		animation: slideUp 0.3s ease-out;
		z-index: 1000;
	  }

	  @keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	  }

	  .consent-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	  }

	  .consent-header h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	  }

	  .consent-content {
		font-size: 0.875rem;
		margin-bottom: 16px;
		color: #4b5563;
	  }

	  .consent-actions {
		display: flex;
		gap: 8px;
	  }

	  .btn {
		padding: 8px 16px;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.875rem;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	  }

	  .btn-primary {
		background-color: #2563eb;
		color: white;
	  }

	  .btn-primary:hover {
		background-color: #1d4ed8;
	  }

	  .btn-secondary {
		background-color: #f3f4f6;
		color: #4b5563;
	  }

	  .btn-secondary:hover {
		background-color: #e5e7eb;
	  }

	  .timer {
		position: absolute;
		bottom: 16px;
		right: 24px;
		font-size: 0.75rem;
		color: #9ca3af;
	  }

	  .loading-indicator {
		border: 3px solid #f3f4f6;
		border-top: 3px solid #2563eb;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		animation: spin 1s linear infinite;
		margin: 0 auto 20px auto;
	  }

	  @keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	  }
	</style>
  </head>
  <body>
	<div class="main-content">
	  <div class="loading-indicator"></div>
	  <div class="redirect-message">
		<h1>Redirecting to <span class="destination">${domain}</span></h1>
		<p>Please wait while we take you to your destination...</p>
	  </div>
	</div>

	<div class="consent-drawer">
	  <div class="consent-header">
		<h2>Allow analytics?</h2>
	  </div>
	  <div class="consent-content">
		We'd like to know if you successfully subscribe on ${domain}. This helps us improve our service.
	  </div>
	  <div class="consent-actions">
		<button class="btn btn-primary" onclick="acceptTracking()">Allow</button>
		<button class="btn btn-secondary" onclick="declineTracking()">No thanks</button>
	  </div>
	  <div class="timer" id="timer">
		Continuing in <span id="countdown">${redirectDelay}</span>s...
	  </div>
	</div>

	<script>
	  // Store the destination and tracking ID
	  const destination = "${originalUrl}";
	  const trackingId = "${trackingId}";

	  // Accept tracking function
	  function acceptTracking() {
		fetch('/api/consent', {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify({
			tracking_id: trackingId,
			consent: true
		  })
		}).then(() => {
		  // Redirect with tracking parameter
		  const url = new URL(destination);
		  url.searchParams.append('utm_tracking_id', trackingId);
		  window.location.href = url.toString();
		});
	  }

	  // Decline tracking function
	  function declineTracking() {
		fetch('/api/consent', {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify({
			tracking_id: trackingId,
			consent: false
		  })
		}).then(() => {
		  // Redirect without tracking parameter
		  window.location.href = destination;
		});
	  }

	  // Countdown timer
	  let timeLeft = ${redirectDelay};
	  const countdownElement = document.getElementById('countdown');

	  const timer = setInterval(() => {
		timeLeft--;
		countdownElement.textContent = timeLeft;

		if (timeLeft <= 0) {
		  clearInterval(timer);
		  declineTracking(); // Default to decline if timer runs out
		}
	  }, 1000);
	</script>
  </body>
  </html>
	`;
  }
