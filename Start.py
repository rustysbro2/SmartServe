import subprocess

# Start bot1.py
bot1_process = subprocess.Popen(['python3', 'bot1.py'])

# Start bot2.py
bot2_process = subprocess.Popen(['python3', 'bot2.py'])

# Wait for both processes to complete
bot1_process.wait()
bot2_process.wait()

print('Both bots have exited.')
