import subprocess
import datetime
import os
import sys

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error executing: {command}")
        print(e.stderr)
        sys.exit(1)

def update_release_plan(message):
    plan_path = "release_plan.md"
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    
    if not os.path.exists(plan_path):
        print(f"Error: {plan_path} not found.")
        return

    # Add log entry to the table
    with open(plan_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_log = f"| {now} | **사용자** | {message} |\n"
    
    # Find the History Log table
    found_table = False
    for i, line in enumerate(lines):
        if "| 날짜 및 시간 | 주체 | 내용 요약 |" in line:
            found_table = True
        elif found_table and ("| :---" in line or "|---" in line):
            # We found the separator, prepend after this line (or at the end of the table)
            # Let's find the end of the table
            insert_pos = i + 1
            while insert_pos < len(lines) and lines[insert_pos].strip().startswith("|"):
                insert_pos += 1
            lines.insert(insert_pos, new_log)
            break

    with open(plan_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"Updated {plan_path} with: {message}")

def main():
    if len(sys.argv) < 2:
        message = input("Commit & Push 메시지: ")
    else:
        message = " ".join(sys.argv[1:])

    if not message.strip():
        print("Message cannot be empty.")
        return

    # 1. Update the log first
    update_release_plan(message)

    # 2. Git steps
    print("Starting Git process...")
    run_command("git add .")
    run_command(f'git commit -m "{message}"')
    run_command("git push origin main")
    print("Successfully pushed to GitHub!")

if __name__ == "__main__":
    main()
