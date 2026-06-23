import urllib.request
import json

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/register',
    data=json.dumps({'email':'testlocal@gmail.com','password':'123'}).encode('utf-8'),
    headers={'Content-Type':'application/json'},
    method='POST'
)
try:
    urllib.request.urlopen(req)
except Exception as e:
    print(e.read().decode('utf-8'))
