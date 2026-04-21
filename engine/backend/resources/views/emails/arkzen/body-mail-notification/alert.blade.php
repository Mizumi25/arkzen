<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #fff7ed; margin: 0; padding: 32px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 520px; margin: auto; border-left: 4px solid #f97316; }
    h1 { color: #c2410c; font-size: 18px; }
    p { color: #374151; }
    a { display: inline-block; margin-top: 16px; background: #f97316; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠ Action Required</h1>
    <p>{{ $alert_message }}</p>
    <a href="{{ $action_url }}">Take Action</a>
    <p style="margin-top:16px;font-size:12px;color:#9ca3af;">Injected via blade_body — MailBuilder v3.1 test.</p>
  </div>
</body>
</html>