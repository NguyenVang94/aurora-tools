#!/usr/bin/env bash
# Foza statusline for Claude Code.

INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null || true)
fi

ESC=$(printf '\033')
color() {
  printf '%s[%sm%s%s[0m' "$ESC" "$2" "$1" "$ESC"
}

json_string() {
  key="$1"
  printf '%s' "$INPUT" |
    grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" |
    sed 's/.*:.*"\([^"]*\)"/\1/' |
    head -1
}

json_number() {
  key="$1"
  printf '%s' "$INPUT" |
    grep -o "\"$key\"[[:space:]]*:[[:space:]]*[-0-9.]*" |
    sed 's/.*:[[:space:]]*//' |
    head -1
}

tracking_number() {
  key="$1"
  printf '%s' "$TRACKING_DATA" |
    grep -o "\"$key\"[[:space:]]*:[[:space:]]*[-0-9.]*" |
    sed 's/.*:[[:space:]]*//' |
    head -1
}

tracking_string() {
  key="$1"
  printf '%s' "$TRACKING_DATA" |
    grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" |
    sed 's/.*:.*"\([^"]*\)"/\1/' |
    head -1
}

short_path() {
  value="$1"
  if [ -z "$value" ]; then value=$(pwd); fi
  home_prefix="$HOME/"
  case "$value" in
    "$home_prefix"*) value="~/$(printf '%s' "$value" | sed "s|^$home_prefix||")" ;;
  esac
  value_len=$(printf '%s' "$value" | wc -c | tr -d ' ')
  if [ "$value_len" -gt 44 ] 2>/dev/null; then
    value=$(printf '%s' "$value" | awk -F/ '{ if (NF >= 2) print $(NF-1)"/"$NF; else print $0 }')
  fi
  printf '%s' "$value"
}

format_model() {
  value="$1"
  if [ -z "$value" ]; then value="unknown"; fi
  lower=$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')
  tier=""
  case "$lower" in
    *opus*) tier="Opus" ;;
    *sonnet*) tier="Sonnet" ;;
    *haiku*) tier="Haiku" ;;
  esac
  if [ -n "$tier" ]; then
    version=$(printf '%s' "$value" | grep -oE '[0-9]+[.-][0-9]+' | tail -1 | tr '-' '.')
    if [ -n "$version" ]; then printf '%s-%s' "$tier" "$version"; else printf '%s' "$tier"; fi
    return
  fi
  printf '%.22s' "$value"
}

format_tokens() {
  num=$(printf '%.0f' "$1" 2>/dev/null || printf '0')
  if [ "$num" -ge 1000000 ] 2>/dev/null; then
    awk -v n="$num" 'BEGIN { printf "%.1fM", n / 1000000 }'
  elif [ "$num" -ge 1000 ] 2>/dev/null; then
    awk -v n="$num" 'BEGIN { printf "%.0fk", n / 1000 }'
  else
    printf '%s' "$num"
  fi
}

format_money() {
  awk -v n="$1" 'BEGIN {
    if (n != 0 && n < 0.01 && n > -0.01) printf "$%.4f", n;
    else printf "$%.2f", n;
  }'
}

progress_bar() {
  pct=$(printf '%.0f' "$1" 2>/dev/null || printf '0')
  if [ "$pct" -lt 0 ] 2>/dev/null; then pct=0; fi
  if [ "$pct" -gt 100 ] 2>/dev/null; then pct=100; fi
  width=5
  filled=$((pct * width / 100))
  empty=$((width - filled))
  bar="["
  i=0
  while [ "$i" -lt "$filled" ]; do bar="$bar#"; i=$((i + 1)); done
  i=0
  while [ "$i" -lt "$empty" ]; do bar="$bar-"; i=$((i + 1)); done
  printf '%s]' "$bar"
}

get_tracking() {
  tmp_root="$TMPDIR"
  if [ -z "$tmp_root" ]; then tmp_root="/tmp"; fi
  cache_dir="$tmp_root/foza-claude-statusline"
  cache_key=$(printf '%s' "$FOZA_TRACKING_URL:$ANTHROPIC_AUTH_TOKEN" | cksum | awk '{ print $1 }')
  cache_file="$cache_dir/tracking-$cache_key.json"

  if [ -n "$FOZA_TRACKING_URL" ] && [ -n "$ANTHROPIC_AUTH_TOKEN" ] && command -v curl >/dev/null 2>&1; then
    response=$(curl -s --max-time 5 -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" "$FOZA_TRACKING_URL" 2>/dev/null || true)
    if [ -n "$response" ]; then
      mkdir -p "$cache_dir" 2>/dev/null || true
      printf '%s' "$response" > "$cache_file" 2>/dev/null || true
      printf '%s' "$response"
      return
    fi
  fi

  if [ -f "$cache_file" ]; then cat "$cache_file"; fi
}

state_file() {
  tmp_root="$TMPDIR"
  if [ -z "$tmp_root" ]; then tmp_root="/tmp"; fi
  cache_dir="$tmp_root/foza-claude-statusline"
  session_value="$SESSION_ID"
  if [ -z "$session_value" ]; then session_value="$TRANSCRIPT_PATH"; fi
  if [ -z "$session_value" ]; then session_value="$CWD:$MODEL"; fi
  state_key=$(printf '%s' "$FOZA_TRACKING_URL:$ANTHROPIC_AUTH_TOKEN:$session_value" | cksum | awk '{ print $1 }')
  mkdir -p "$cache_dir" 2>/dev/null || true
  printf '%s/state-%s.env' "$cache_dir" "$state_key"
}

CWD=$(json_string cwd)
if [ -z "$CWD" ]; then CWD=$(pwd); fi
MODEL=$(json_string display_name)
if [ -z "$MODEL" ]; then MODEL=$(json_string id); fi
if [ -z "$MODEL" ]; then MODEL="unknown"; fi
SESSION_ID=$(json_string session_id)
TRANSCRIPT_PATH=$(json_string transcript_path)

INPUT_TOKENS=$(json_number input_tokens)
CACHE_CREATION=$(json_number cache_creation_input_tokens)
CACHE_READ=$(json_number cache_read_input_tokens)
MAX_TOKENS=$(json_number context_window_size)
USED_PERCENTAGE=$(json_number used_percentage)
LINES_ADDED=$(json_number total_lines_added)
LINES_REMOVED=$(json_number total_lines_removed)
CHANGED_FILES=$(json_number gitNumStagedOrUnstagedFilesChanged)

if [ -z "$INPUT_TOKENS" ]; then INPUT_TOKENS=0; fi
if [ -z "$CACHE_CREATION" ]; then CACHE_CREATION=0; fi
if [ -z "$CACHE_READ" ]; then CACHE_READ=0; fi
if [ -z "$MAX_TOKENS" ]; then MAX_TOKENS=200000; fi
if [ -z "$USED_PERCENTAGE" ]; then USED_PERCENTAGE=0; fi
if [ -z "$LINES_ADDED" ]; then LINES_ADDED=0; fi
if [ -z "$LINES_REMOVED" ]; then LINES_REMOVED=0; fi
if [ -z "$CHANGED_FILES" ]; then CHANGED_FILES=0; fi
CONTEXT_TOKENS=$((INPUT_TOKENS + CACHE_CREATION + CACHE_READ))

if [ "$USED_PERCENTAGE" -gt 0 ] 2>/dev/null; then
  CTX_PCT="$USED_PERCENTAGE"
elif [ "$MAX_TOKENS" -gt 0 ] 2>/dev/null; then
  CTX_PCT=$((CONTEXT_TOKENS * 100 / MAX_TOKENS))
else
  CTX_PCT=0
fi

BRANCH=""
if [ -n "$CWD" ] && [ -d "$CWD" ] && command -v git >/dev/null 2>&1; then
  BRANCH=$(git -C "$CWD" branch --show-current 2>/dev/null || true)
fi

LINE1="$(color "$(short_path "$CWD")" 36)"
if [ -n "$BRANCH" ]; then
  LINE1="$LINE1  $(color git: 90) $(color "$BRANCH" 97)"
  if [ "$CHANGED_FILES" -gt 0 ] 2>/dev/null; then LINE1="$LINE1 $(color "($CHANGED_FILES)" 33)"; fi
fi
if [ "$LINES_ADDED" -gt 0 ] 2>/dev/null || [ "$LINES_REMOVED" -gt 0 ] 2>/dev/null; then
  LINE1="$LINE1  $(color "+$LINES_ADDED" 32) $(color "-$LINES_REMOVED" 31)"
fi

LINE2="$(progress_bar "$CTX_PCT") $(color "$CTX_PCT%" 97) $(color "|" 90) $(color "$(format_model "$MODEL")" 97)"

TRACKING_DATA=$(get_tracking)
if [ -n "$TRACKING_DATA" ]; then
  BALANCE=$(tracking_number balance)
  LAST_USAGE_ID=$(tracking_string last_usage_id)
  LAST_TOKENS=$(tracking_number last_total_tokens)
  LAST_COST=$(tracking_number last_total_cost)
  if [ -z "$BALANCE" ]; then BALANCE=0; fi
  if [ -z "$LAST_USAGE_ID" ]; then LAST_USAGE_ID="none"; fi
  if [ -z "$LAST_TOKENS" ]; then LAST_TOKENS=0; fi
  if [ -z "$LAST_COST" ]; then LAST_COST=0; fi
  if awk -v n="$BALANCE" 'BEGIN { exit !(n != 0) }'; then
    LINE2="$LINE2 $(color "|" 90) $(color "$(format_money "$BALANCE")" 32)"
  fi
  STATE_FILE=$(state_file)
  SEEN_USAGE_ID=""
  DISPLAY_TOKENS=""
  DISPLAY_COST=""
  if [ -f "$STATE_FILE" ]; then
    SEEN_USAGE_ID=$(sed -n 's/^seen_usage_id=//p' "$STATE_FILE" | head -1)
    DISPLAY_TOKENS=$(sed -n 's/^display_tokens=//p' "$STATE_FILE" | head -1)
    DISPLAY_COST=$(sed -n 's/^display_cost=//p' "$STATE_FILE" | head -1)
  fi
  if [ -z "$SEEN_USAGE_ID" ]; then
    {
      printf 'seen_usage_id=%s\n' "$LAST_USAGE_ID"
      printf 'display_tokens=\n'
      printf 'display_cost=\n'
    } > "$STATE_FILE" 2>/dev/null || true
    DISPLAY_TOKENS=""
    DISPLAY_COST=""
  elif [ "$LAST_USAGE_ID" != "none" ] && [ "$LAST_USAGE_ID" != "$SEEN_USAGE_ID" ]; then
    DISPLAY_TOKENS="$LAST_TOKENS"
    DISPLAY_COST="$LAST_COST"
    {
      printf 'seen_usage_id=%s\n' "$LAST_USAGE_ID"
      printf 'display_tokens=%s\n' "$DISPLAY_TOKENS"
      printf 'display_cost=%s\n' "$DISPLAY_COST"
    } > "$STATE_FILE" 2>/dev/null || true
  fi
  if [ -n "$DISPLAY_TOKENS" ] && awk -v n="$DISPLAY_TOKENS" 'BEGIN { exit !(n != 0) }'; then
    LINE2="$LINE2 $(color "|" 90) $(color "Last cost:" 90) $(color "$(format_tokens "$DISPLAY_TOKENS") tokens" 97) $(color "$(format_money "$DISPLAY_COST")" 33)"
  fi
fi

printf '%s\n%s\n' "$LINE1" "$LINE2"
