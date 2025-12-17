#!/bin/bash

# $1 is the single variable
SINGLE_VAR="$1"

# Shift moves the arguments so that $1 disappears, 
# and the remaining ($2, $3, $4) become the new ($1, $2, $3)
shift

# Capture all remaining arguments into a real Bash array
MY_ARRAY=("$@")

echo "Single Var: $SINGLE_VAR"
echo "Array element 0: ${MY_ARRAY[0]}"
echo "Array element 1: ${MY_ARRAY[1]}"
echo "Full Array count: ${#MY_ARRAY[@]}"