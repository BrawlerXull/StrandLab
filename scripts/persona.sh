#!/bin/bash
# usage: persona.sh NAME "front prompt" "hair description for consistency"
set -e
N=$1; FP=$2; HD=$3
python3 gen.py ${N}_front "$FP"
B="Same person from Image 1, identical face and identical hair ($HD) with the same texture, volume and frizz, plain white crew-neck t-shirt, plain light grey background, soft even lighting, photorealistic."
python3 angle.py ../fixtures/${N}_front.jpg ${N}_front2 "$B Facing the camera straight on, head perfectly level, neutral expression, head and shoulders, entire hair visible." &
python3 angle.py ../fixtures/${N}_front.jpg ${N}_right "$B Head turned about 40 degrees to their left so the camera sees the right side of the face and hair in three-quarter view, head and shoulders." &
python3 angle.py ../fixtures/${N}_front.jpg ${N}_bow "$B Tilting the head forward and down about 35 degrees toward the camera so the top of the head, hairline and parting are clearly visible, face still visible looking down. Camera slightly above eye level." &
wait
sips -f horizontal ../fixtures/${N}_right.jpg --out ../fixtures/${N}_left.jpg >/dev/null
