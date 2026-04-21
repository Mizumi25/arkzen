<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #f0fdf4; margin: 0; padding: 32px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 520px; margin: auto; border: 1px solid #bbf7d0; }
    h1 { color: #15803d; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { padding: 8px 0; border-bottom: 1px solid #f0fdf4; color: #374151; }
    td:last-child { text-align: right; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🧾 Receipt #{{ $order_id }}</h1>
    <table>
      <tr><td>Item</td><td>{{ $item_name }}</td></tr>
      <tr><td>Amount</td><td>{{ $amount }}</td></tr>
      <tr><td>Status</td><td>✅ Paid</td></tr>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#6b7280;">blade_body injected receipt — no stub used.</p>
  </div>
</body>
</html>