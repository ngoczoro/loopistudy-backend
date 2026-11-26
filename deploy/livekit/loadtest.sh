#!/usr/bin/env bash
# Runs the load-test scenarios one after another and keeps each run's output.
#
#   export LIVEKIT_URL=ws://<server private IP>:7880   # private IP: no egress charges
#   export LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=...
#   ./loadtest.sh            # every scenario
#   ./loadtest.sh B C        # only some of them
#
# A room of N people is simulated as N video publishers + N subscribers, since a
# real member both sends and receives. Run monitor.sh on both machines meanwhile.
set -euo pipefail

: "${LIVEKIT_URL:?set LIVEKIT_URL}" "${LIVEKIT_API_KEY:?}" "${LIVEKIT_API_SECRET:?}"
DURATION=${DURATION:-3m}
REST=${REST:-60}
RESULTS=${RESULTS:-results}
mkdir -p "$RESULTS"

# name | rooms | video publishers per room | subscribers per room | audio publishers per room
SCENARIOS=(
  "A|1|5|5|0"     # one small group
  "B|1|10|10|0"   # one group of 10
  "C|1|25|25|0"   # one full room (CALL_MAX_PARTICIPANTS)
  "D|3|10|10|0"   # 3 groups at once
  "E|5|10|10|0"   # 5 groups at once
  "F|1|0|50|50"   # audio only, 50 people
)

run_room() {
  local room=$1 video=$2 subs=$3 audio=$4 log=$5
  lk load-test --url "$LIVEKIT_URL" --api-key "$LIVEKIT_API_KEY" --api-secret "$LIVEKIT_API_SECRET" \
    --room "$room" --video-publishers "$video" --audio-publishers "$audio" \
    --subscribers "$subs" --duration "$DURATION" >"$log" 2>&1
}

wanted=("$@")
for scenario in "${SCENARIOS[@]}"; do
  IFS='|' read -r name rooms video subs audio <<<"$scenario"
  if ((${#wanted[@]})) && [[ ! " ${wanted[*]} " =~ " $name " ]]; then continue; fi

  echo "=== $name: $rooms room(s) × ($video video + $audio audio publishers, $subs subscribers) — $(date +%H:%M:%S)"
  pids=()
  for ((r = 1; r <= rooms; r++)); do
    run_room "load-$name-$r" "$video" "$subs" "$audio" "$RESULTS/$name-room$r.log" &
    pids+=($!)
  done
  for pid in "${pids[@]}"; do wait "$pid" || echo "  a room in $name exited with an error, see its log"; done
  echo "=== $name done — $(date +%H:%M:%S). Logs: $RESULTS/$name-room*.log"

  sleep "$REST"
done
