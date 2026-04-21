<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #f8fafc; margin: 0; padding: 32px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 520px; margin: auto; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    h1 { font-size: 22px; color: #1e293b; margin-bottom: 8px; }
    p { color: #475569; line-height: 1.6; }
    .badge { display: inline-block; background: #0f172a; color: #fff; border-radius: 6px; padding: 4px 12px; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome, {{ $name }}!</h1>
    <p>You are now part of <strong>{{ $app_name }}</strong>. This email was generated from a <code>blade_body</code> block injected via the Arkzen DSL — no manually created Blade file required.</p>
    <span class="badge">✓ blade_body injection works</span>
  </div>
</body>
</html>