#!/usr/bin/env bash
# Logs CPU, memory and network throughput to a CSV while a load test runs.
#
#   ./monitor.sh results/server.csv        # every 5 seconds, Ctrl+C to stop
#   INTERVAL=2 ./monitor.sh results/server.csv
#
# Run it on the LiveKit server, and on the load generator too: if the generator's
# CPU goes above ~85%, the numbers measure the generator, not the server.
set -euo pipefail

OUT=${1:-metrics.csv}
INTERVAL=${INTERVAL:-5}
IFACE=${IFACE:-$(ip route show default | awk '{print $5; exit}')}
STATS=/sys/class/net/$IFACE/statistics

mkdir -p "$(dirname "$OUT")"

cpu_sample() { awk '/^cpu /{ total = 0; for (i = 2; i <= NF; i++) total += $i; print total, $5 + $6 }' /proc/stat; }

read -r cpu_total cpu_idle < <(cpu_sample)
rx=$(<"$STATS/rx_bytes")
tx=$(<"$STATS/tx_bytes")

[[ -s "$OUT" ]] || echo "time,cpu_percent,mem_used_mb,rx_mbps,tx_mbps" >"$OUT"
echo "Logging $IFACE every ${INTERVAL}s to $OUT (Ctrl+C to stop)"

while sleep "$INTERVAL"; do
  read -r total idle < <(cpu_sample)
  new_rx=$(<"$STATS/rx_bytes")
  new_tx=$(<"$STATS/tx_bytes")
  mem=$(free -m | awk '/^Mem:/{ print $3 }')

  awk -v t="$(date +%H:%M:%S)" -v dt=$((total - cpu_total)) -v di=$((idle - cpu_idle)) \
      -v drx=$((new_rx - rx)) -v dtx=$((new_tx - tx)) -v s="$INTERVAL" -v mem="$mem" \
      'BEGIN { printf "%s,%.1f,%d,%.2f,%.2f\n", t, dt ? 100 * (dt - di) / dt : 0, mem, drx * 8 / s / 1e6, dtx * 8 / s / 1e6 }' \
    | tee -a "$OUT"

  cpu_total=$total cpu_idle=$idle rx=$new_rx tx=$new_tx
done
