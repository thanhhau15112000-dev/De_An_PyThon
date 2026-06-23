import urllib.request
import json

req = urllib.request.Request(
    'https://pricetracker-be.onrender.com/api/auth/register',
    data=json.dumps({'email':'test@test.com','password':'123'}).encode('utf-8'),
    headers={'Content-Type':'application/json'},
    method='POST'
)
try:
    urllib.request.urlopen(req)
except Exception as e:
    print(e.read().decode('utf-8'))
