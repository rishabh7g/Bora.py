#!/usr/bin/env python3
"""Run the curriculum against a real Python and report output drift.

Every worked example's `code` and every exercise `solution` in
content/curriculum.json is written to a real `hello.py` and executed with
python3 — interactive ones through a pty, typing the declared `inputsToType`
so the transcript includes the echoed keystrokes exactly as a terminal shows
them. The captured stdout+stderr is compared byte-for-byte with the authored
`output` / `expectedOutput` (trailing newlines normalised, since the app
renders the block without one).

Usage:  python3 scripts/verify-outputs.py [moduleId ...]     # default m1..m8
Exit code 1 if any drift is found.

Tracebacks print the absolute path of the running file, which is machine
specific; the authored content uses the bare `hello.py` (the file name Module 0
tells the learner to create), so the run directory is stripped before
comparing.
"""

import json
import os
import pty
import select
import subprocess
import sys
import tempfile
import time

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CURRICULUM = os.path.join(REPO_ROOT, 'content', 'curriculum.json')
DEFAULT_MODULES = [f'm{n}' for n in range(1, 9)]

# Worked examples that call input() have no `inputsToType` field of their own
# (that field belongs to exercises), so the keystrokes they narrate live here.
EXAMPLE_INPUTS = {
    ('m8', 1): ['Jimin'],
    ('m8', 2): ['Jin', 'V'],
    ('m12', 0): ['Jungkook'],
}


def write_program(run_dir, code):
    path = os.path.join(run_dir, 'hello.py')
    with open(path, 'w') as handle:
        handle.write(code + '\n')
    return path


def run_plain(run_dir, code):
    write_program(run_dir, code)
    finished = subprocess.run(
        [sys.executable, 'hello.py'],
        cwd=run_dir,
        capture_output=True,
        text=True,
        timeout=20,
    )
    return finished.stdout + finished.stderr


def run_interactive(run_dir, code, inputs):
    """Run under a pty, typing one input each time the program goes quiet."""
    write_program(run_dir, code)
    pending = list(inputs)
    captured = b''
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(run_dir)
        os.execv(sys.executable, [sys.executable, 'hello.py'])
    deadline = time.time() + 20
    quiet_since = time.time()
    while time.time() < deadline:
        readable, _, _ = select.select([fd], [], [], 0.15)
        if readable:
            try:
                chunk = os.read(fd, 4096)
            except OSError:
                break
            if not chunk:
                break
            captured += chunk
            quiet_since = time.time()
            continue
        if pending and time.time() - quiet_since > 0.15:
            os.write(fd, (pending.pop(0) + '\n').encode())
            quiet_since = time.time()
            continue
        if not pending:
            try:
                exited, _ = os.waitpid(pid, os.WNOHANG)
            except ChildProcessError:
                break
            if exited:
                break
    os.close(fd)
    try:
        os.waitpid(pid, 0)
    except ChildProcessError:
        pass
    return captured.decode('utf-8', 'replace').replace('\r\n', '\n')


def normalise(run_dir, text):
    return text.replace(os.path.join(run_dir, 'hello.py'), 'hello.py').rstrip('\n')


def check(run_dir, where, code, expected, inputs):
    actual = (
        run_interactive(run_dir, code, inputs)
        if 'input(' in code
        else run_plain(run_dir, code)
    )
    actual = normalise(run_dir, actual)
    if actual == expected.rstrip('\n'):
        return None
    return (where, expected, actual)


def main():
    module_ids = sys.argv[1:] or DEFAULT_MODULES
    curriculum = json.load(open(CURRICULUM))
    drift = []
    ran = 0

    with tempfile.TemporaryDirectory() as run_dir:
        for module_id in module_ids:
            module = curriculum['modules'][module_id]
            for index, example in enumerate(module['concept']['examples']):
                inputs = EXAMPLE_INPUTS.get((module_id, index), [])
                if 'input(' in example['code'] and not inputs:
                    print(f'{module_id}/example[{index}]: needs EXAMPLE_INPUTS entry')
                    drift.append((f'{module_id}/example[{index}]', example['output'], '(not run)'))
                    continue
                ran += 1
                found = check(
                    run_dir,
                    f'{module_id}/example[{index}]',
                    example['code'],
                    example['output'],
                    inputs,
                )
                if found:
                    drift.append(found)
            for exercise in list(module['exercises']) + [module['exitExercise']]:
                ran += 1
                found = check(
                    run_dir,
                    f"{module_id}/{exercise['id']}",
                    exercise['solution'],
                    exercise['expectedOutput'],
                    exercise.get('inputsToType', []),
                )
                if found:
                    drift.append(found)

    for where, expected, actual in drift:
        print(f'\n### {where}')
        print(f'  authored: {expected!r}')
        print(f'  real     : {actual!r}')

    print(f'\nverify-outputs: ran {ran} program(s), {len(drift)} drift')
    return 1 if drift else 0


if __name__ == '__main__':
    sys.exit(main())
