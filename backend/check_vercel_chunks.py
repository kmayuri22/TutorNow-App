import urllib.request, re

try:
    req = urllib.request.Request(
        'https://tutor-now-app-y3bo.vercel.app/student/tutors',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')
    js_files = re.findall(r'/_next/static/chunks/[^" ]+\.js', html)
    print('Found JS chunks on Vercel:', len(js_files))
    for js in set(js_files):
        try:
            chunk = urllib.request.urlopen('https://tutor-now-app-y3bo.vercel.app' + js, timeout=15).read().decode('utf-8', errors='ignore')
            if '09:00 AM' in chunk or '09:00 - 10:00' in chunk:
                print('>>> OLD 09:00 HARDCODED SLOTS STILL PRESENT IN VERCEL CHUNK:', js)
            if 'tutorSlots' in chunk:
                print('>>> NEW tutorSlots FOUND IN VERCEL CHUNK:', js)
        except Exception as e:
            pass
except Exception as e:
    print("Error:", e)
