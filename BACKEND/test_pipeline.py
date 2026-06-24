import sys, json
sys.path.insert(0, '.')
from data_loader import normalize_candidate, build_candidate_text, build_ce_passage
from scoring_engine import compute_first_pass_score
from honeypot_detector import detect_honeypot
from reasoning_generator import build_reasoning

# Load sample candidates
with open('../[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/sample_candidates.json', 'r') as f:
    raw_list = json.load(f)

print(f'Loaded {len(raw_list)} sample candidates')

# Normalize
candidates = []
for raw in raw_list:
    cand = normalize_candidate(raw)
    candidates.append(cand)

print(f'Normalized: {len(candidates)} candidates')
for c in candidates[:5]:
    print(f'  {c["candidate_id"]} - {c["current_title"]} @ {c["current_company"]}')

# Score all (no embeddings, semantic=0)
print()
print('=== Scoring ===')
all_feats = []
for c in candidates:
    hp = detect_honeypot(c)
    feat = compute_first_pass_score(c, semantic_score=0.30)
    feat.update(hp)
    all_feats.append((c, feat))

all_feats.sort(key=lambda x: -x[1]['first_pass_score'])

print('Top 10 by first_pass_score:')
for i, (c, f) in enumerate(all_feats[:10], 1):
    cid = c['candidate_id']
    title = c['current_title'][:30]
    fps = f['first_pass_score']
    skill = f['skill_score']
    career = f['career_score']
    hp = f['honeypot_confidence']
    reasoning = build_reasoning(c, f, i)
    print(f'  #{i} {cid} [{title}] fps={fps:.4f} skill={skill:.3f} career={career:.3f} hp={hp:.3f}')
    print(f'      Reasoning: {reasoning[:100]}...')

print()
print('Test passed!')
