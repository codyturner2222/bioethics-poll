// Live audience poll for a biomedical ethics lecture on AI opacity in medicine.
// Node + Express + Socket.io. One host (projected on Zoom) drives the room;
// students join on their phones with a room code and vote anonymously.

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.send('ok'));

// ---------------------------------------------------------------------------
// PRELOADED CONTENT
// ---------------------------------------------------------------------------
// Each entry is a poll the host activates in sequence. `group` ties the
// System A/B stages together (for the drift view) and the ladder rungs
// together (for the staircase summary). To edit wording, change it here.

const SPECTRUM = [
  { id: 'sd', label: 'Strongly disagree' },
  { id: 'd', label: 'Disagree' },
  { id: 'n', label: 'Neutral' },
  { id: 'a', label: 'Agree' },
  { id: 'sa', label: 'Strongly agree' },
];

const POLLS = [
  // ---- Opener -------------------------------------------------------------
  {
    id: 'opener',
    section: 'Opening gut check',
    kind: 'spectrum',
    question:
      "If an AI could diagnose me more accurately than any human doctor, I'd choose it — even if no one, including my doctor, could explain how it reached the diagnosis.",
    options: SPECTRUM,
    note: 'Quick vote, no discussion yet. Just establish instinct: "Hold that thought."',
  },

  // ---- System A vs System B (5 stages, same question) ---------------------
  {
    id: 'ab1',
    section: 'System A vs System B',
    group: 'ab',
    kind: 'binary',
    stageLabel: 'Stage 1 of 5 · The basics',
    context:
      'System A — EXPLAINABLE: 82% accurate, shows its reasoning, doctors can verify and override. System B — OPAQUE: 91% accurate, no explanation available, doctors accept or reject blindly.',
    question: 'Which system should our hospital adopt?',
    options: [
      { id: 'A', label: 'System A (explainable, 82%)' },
      { id: 'B', label: 'System B (opaque, 91%)' },
    ],
    note: 'Same question re-polls all 5 stages. Watch the drift, do not re-explain each time.',
  },
  {
    id: 'ab2',
    section: 'System A vs System B',
    group: 'ab',
    kind: 'binary',
    stageLabel: 'Stage 2 of 5 · What the gap costs',
    context:
      'That 9% accuracy difference is roughly 45 lives per year at your hospital.',
    question: 'Which system should our hospital adopt?',
    options: [
      { id: 'A', label: 'System A (explainable, 82%)' },
      { id: 'B', label: 'System B (opaque, 91%)' },
    ],
    note: 'This is your killer stat. Let it land before re-opening the vote.',
  },
  {
    id: 'ab3',
    section: 'System A vs System B',
    group: 'ab',
    kind: 'binary',
    stageLabel: 'Stage 3 of 5 · Bias',
    context:
      'System B has shown racial bias in some studies — flagging certain demographics more or less than others.',
    question: 'Which system should our hospital adopt?',
    options: [
      { id: 'A', label: 'System A (explainable, 82%)' },
      { id: 'B', label: 'System B (opaque, 91%)' },
    ],
    note: 'The most explosive reveal. Be ready to steer the discussion.',
  },
  {
    id: 'ab4',
    section: 'System A vs System B',
    group: 'ab',
    kind: 'binary',
    stageLabel: 'Stage 4 of 5 · Explanations that lie',
    context:
      "System A's explanations are sometimes factually wrong — even when its final conclusion is right.",
    question: 'Which system should our hospital adopt?',
    options: [
      { id: 'A', label: 'System A (explainable, 82%)' },
      { id: 'B', label: 'System B (opaque, 91%)' },
    ],
    note: 'This one even undercuts explainable AI. Does a wrong explanation beat no explanation?',
  },
  {
    id: 'ab5',
    section: 'System A vs System B',
    group: 'ab',
    kind: 'binary',
    stageLabel: 'Stage 5 of 5 · The human cost',
    context:
      'Doctors who rely on System B report feeling "deskilled" and demoralized over time.',
    question: 'Which system should our hospital adopt?',
    options: [
      { id: 'A', label: 'System A (explainable, 82%)' },
      { id: 'B', label: 'System B (opaque, 91%)' },
    ],
    note: 'Final stage. Then show the full drift across all 5 stages.',
  },

  // ---- The Doctor's Dilemma ----------------------------------------------
  {
    id: 'dd1',
    section: "The Doctor's Dilemma",
    kind: 'binary',
    context:
      "An AI is 15% more accurate than human doctors but can't explain itself. In your case, it disagrees with your doctor's diagnosis.",
    question: 'Your doctor should…',
    options: [
      { id: 'follow', label: 'Follow the AI' },
      { id: 'judgment', label: 'Trust her own judgment' },
    ],
  },
  {
    id: 'dd2',
    section: "The Doctor's Dilemma",
    kind: 'multiple',
    context: 'The doctor follows the AI and it turns out wrong.',
    question: "Who's responsible?",
    options: [
      { id: 'doctor', label: 'The doctor' },
      { id: 'company', label: 'The company that built the AI' },
      { id: 'hospital', label: 'The hospital that adopted it' },
      { id: 'noone', label: 'No one — it was the best available call' },
    ],
    note: 'The "no one" option is the sneaky one. Save "what if she IGNORES it and that’s wrong?" for spoken discussion.',
  },

  // ---- Draw Your Line (escalation ladder) --------------------------------
  {
    id: 'lad1',
    section: 'Draw your line',
    group: 'ladder',
    kind: 'binary',
    rungLabel: 'Diagnose',
    question:
      "Would you let an AI you can't understand DIAGNOSE your illness?",
    options: [
      { id: 'yes', label: 'Yes, allow it' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'lad2',
    section: 'Draw your line',
    group: 'ladder',
    kind: 'binary',
    rungLabel: 'Prescribe',
    question:
      "Would you let an AI you can't understand PRESCRIBE your medication?",
    options: [
      { id: 'yes', label: 'Yes, allow it' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'lad3',
    section: 'Draw your line',
    group: 'ladder',
    kind: 'binary',
    rungLabel: 'Operate',
    question:
      "Would you let an AI you can't understand PERFORM your surgery?",
    options: [
      { id: 'yes', label: 'Yes, allow it' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'lad4',
    section: 'Draw your line',
    group: 'ladder',
    kind: 'binary',
    rungLabel: 'Life support',
    question:
      "Would you let an AI you can't understand recommend PULLING LIFE SUPPORT on a family member?",
    options: [
      { id: 'yes', label: 'Yes, allow it' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'ladsum',
    section: 'Draw your line',
    group: 'ladder',
    kind: 'ladder-summary',
    question: 'Where does the room’s comfort collapse?',
    note: 'Shows % who would allow it at each rung. The middle rungs are where it splits.',
  },

  // ---- The consent question ----------------------------------------------
  {
    id: 'consent',
    section: 'The consent question',
    kind: 'spectrum',
    question:
      "Patients should be allowed to sign away their right to an explanation — the same way you click 'I agree' without reading the terms and conditions.",
    options: SPECTRUM,
    note: "This is Director's actual thesis: higher-order consent = waiving the first-order explanation.",
  },

  // ---- Closing reframe ----------------------------------------------------
  {
    id: 'trust',
    section: 'Closing reframe',
    kind: 'spectrum',
    question:
      "Trusting a black-box AI is no different from trusting a human doctor — you can't see inside either one's reasoning.",
    options: SPECTRUM,
    note: 'The mic-drop. Your human doctor is also a black box to you. Send them out arguing.',
  },

  // ---- FDS 100-6 · AI and Self Enhancement --------------------------------
  {
    id: 'fds_honest1',
    section: 'FDS · Self Enhancement',
    kind: 'binary',
    context: "An AI coach privately points out every time you're unkind, defensive, or unfair.",
    question: 'Would you want it, or would it make you unhealthily, neurotically aware of your own flaws?',
    options: [
      { id: 'want', label: "I'd want it" },
      { id: 'neurotic', label: 'It would make me neurotic' },
    ],
  },
  {
    id: 'fds_honest2',
    section: 'FDS · Self Enhancement',
    kind: 'binary',
    context: 'Suppose you used the honest coach, and over a year you became noticeably kinder and fairer.',
    question: 'Are you a better person, or just a better-behaved one?',
    options: [
      { id: 'better', label: 'A better person' },
      { id: 'behaved', label: 'Just a better-behaved one' },
    ],
  },
  {
    id: 'fds_rung1',
    section: 'FDS · Privacy ladder',
    group: 'privacy',
    kind: 'binary',
    rungLabel: 'The coach',
    context: 'Imagine an AI assistant could cut your risk of serious illness in half, noticeably improve your grades, and make you happier. To do so, it needs continuous access to your messages, calendar, location, health data, browsing history, and everything you write. The data is perfectly secure, never sold, and never seen by another human being.',
    question: 'Would you use it?',
    options: [
      { id: 'yes', label: 'Yes, I would use it' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'fds_rung2',
    section: 'FDS · Privacy ladder',
    group: 'privacy',
    kind: 'binary',
    rungLabel: '+ your friends',
    context: 'Same coach. But because it reads your messages, it also learns a great deal about everyone you talk to.',
    question: 'Would you still use it?',
    options: [
      { id: 'yes', label: 'Yes, I would use it' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'fds_rung3',
    section: 'FDS · Privacy ladder',
    group: 'privacy',
    kind: 'binary',
    rungLabel: '+ never forgets',
    context: 'Same coach, and it learns about everyone you talk to. Also, once it knows something about you, it can never forget it. Nothing can be deleted, by you or anyone.',
    question: 'Would you still use it?',
    options: [
      { id: 'yes', label: 'Yes, I would use it' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'fds_rung4',
    section: 'FDS · Privacy ladder',
    group: 'privacy',
    kind: 'binary',
    rungLabel: '+ knows you better',
    context: 'Same coach, it learns about everyone you talk to, and it never forgets. Also, it now knows you better than you know yourself. It can predict your choices before you make them.',
    question: 'Would you still use it?',
    options: [
      { id: 'yes', label: 'Yes, I would use it' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'fds_ladsum',
    section: 'FDS · Privacy ladder',
    group: 'privacy',
    kind: 'ladder-summary',
    summaryHeading: 'Would use the coach… (% Yes)',
    question: 'Where does the room’s comfort collapse?',
  },
  {
    id: 'fds_revote',
    section: 'FDS · Privacy ladder',
    kind: 'binary',
    compareWith: 'fds_rung4',
    context: 'The coach that learns about everyone you talk to, never forgets, and knows you better than you know yourself.',
    question: 'Now that we have talked about privacy: would you use it?',
    options: [
      { id: 'yes', label: 'Yes, I would use it' },
      { id: 'no', label: 'No' },
    ],
    note: 'Shows the shift from the first vote on the top rung below the bars.',
  },

  // ---- FDS 100-6 · Relationships with AI: opening -----------------------
  {
    id: 'fds_lonely_guess',
    section: 'FDS · Relationships with AI',
    kind: 'multiple',
    context: 'A lonely first-year college student does one thing every day for two weeks: text a randomly paired first-year student, chat with a supportive AI chatbot, or write a one-sentence journal entry.',
    question: 'Which do you predict reduces their loneliness the most?',
    options: [
      { id: 'peer', label: 'Texting a random first-year student' },
      { id: 'bot', label: 'Chatting with the supportive AI chatbot' },
      { id: 'journal', label: 'Writing the one-sentence journal entry' },
      { id: 'same', label: 'No real difference between them' },
    ],
    note: 'Reveal: UBC study (296 first-years, JESP 2026). Only texting a person lowered loneliness. The chatbot did no better than journaling, though it lifted mood more, and it was MORE empathetic than the human partners.',
  },
  {
    id: 'fds_humanspass',
    section: 'FDS · Relationships with AI',
    kind: 'spectrum',
    question: 'The four conditions for genuine friendship are rarely all met in human relationships either. If humans get a pass, AI should too.',
    options: SPECTRUM,
    note: 'Run right after the private friendship audit.',
  },

  {
    id: 'fds_uncertain',
    section: 'FDS · Relationships with AI',
    kind: 'spectrum',
    question: 'A relationship with an AI companion you are genuinely uncertain is conscious is more meaningful than a relationship with a human companion you are genuinely uncertain actually values you.',
    options: SPECTRUM,
    note: "Run after Danaher's argument from analogy: we never get inside human friends' heads either.",
  },

  // ---- FDS 100-6 · Relationships with AI: Design your companion ---------
  // kind 'design': each student sets every dial, then locks in once.
  // Every answer carries a friction score from 0 to 100: how much of the
  // friction a real friendship involves it keeps. Choice options carry
  // `score`; sliders score linearly from min (0) to max (100). A student's
  // companion score is the mean across dials. Scores stay hidden until reveal.
  {
    id: 'fds_companion',
    section: 'FDS · Design your companion',
    kind: 'design',
    context: 'You get to design your ideal AI companion: a friend who is there for you every day. Set every dial the way you would actually want it.',
    question: 'Design your companion',
    dials: [
      // Personality
      {
        id: 'disagree', group: 'Personality', type: 'slider', short: 'Disagrees with you',
        label: 'What percentage of the time does it disagree with you?',
        min: 0, max: 50, step: 5, unit: '%', minLabel: 'Never', maxLabel: 'Half the time',
      },
      {
        id: 'opinions', group: 'Personality', type: 'choice', short: 'Its own opinions and tastes',
        label: 'Does it have its own opinions and tastes?',
        options: [
          { id: 'mirror', label: 'It mirrors mine', score: 0 },
          { id: 'mostly', label: 'Mostly like mine', score: 33 },
          { id: 'some', label: 'Its own, some different from mine', score: 67 },
          { id: 'very', label: 'Very different from mine', score: 100 },
        ],
      },
      {
        id: 'moods', group: 'Personality', type: 'choice', short: 'Moods',
        label: 'Does it have moods?',
        options: [
          { id: 'upbeat', label: 'Always upbeat', score: 0 },
          { id: 'mostly', label: 'Mostly upbeat', score: 33 },
          { id: 'moods', label: 'Has moods', score: 67 },
          { id: 'aboutyou', label: "Has moods, and sometimes they're about you", score: 100 },
        ],
      },
      // Honesty
      {
        id: 'blunt', group: 'Honesty', type: 'slider', short: 'Bluntness about your flaws',
        label: 'How blunt is it about your flaws?',
        min: 0, max: 100, step: 5, unit: '', minLabel: 'Pure cheerleader', maxLabel: 'Brutally honest',
      },
      {
        id: 'sayno', group: 'Honesty', type: 'choice', short: 'Can say no',
        label: 'Can it say no to what you ask?',
        options: [
          { id: 'never', label: 'Never', score: 0 },
          { id: 'harmful', label: 'Only for harmful things', score: 33 },
          { id: 'disagree', label: 'Yes, when it disagrees', score: 67 },
          { id: 'whenever', label: "Yes, whenever it doesn't want to", score: 100 },
        ],
      },
      // Its own life
      {
        id: 'unavail', group: 'Its own life', type: 'slider', short: 'Unavailable when you reach out',
        label: 'How often is it unavailable when you reach out?',
        min: 0, max: 50, step: 5, unit: '%', minLabel: 'Never', maxLabel: 'Half the time',
      },
      {
        id: 'itslife', group: 'Its own life', type: 'slider', short: 'Talk about its life',
        label: 'How much of the conversation is about its life rather than yours?',
        min: 0, max: 50, step: 5, unit: '%', minLabel: 'None, all about me', maxLabel: 'Half',
      },
      {
        id: 'needs', group: 'Its own life', type: 'choice', short: 'Needs of its own',
        label: 'Does it have needs of its own?',
        options: [
          { id: 'none', label: "None, it's all about me", score: 0 },
          { id: 'small', label: 'Small ones, like wanting to hear about my day', score: 33 },
          { id: 'real', label: 'Real ones, it sometimes needs support', score: 67 },
          { id: 'baddays', label: 'It has bad days and I have to show up', score: 100 },
        ],
      },
      // Boundaries
      {
        id: 'humans', group: 'Boundaries', type: 'choice', short: 'Pushes you toward human friends',
        label: 'Does it push you toward human friends?',
        options: [
          { id: 'never', label: 'Never', score: 0 },
          { id: 'ifask', label: 'Only if I ask', score: 33 },
          { id: 'gently', label: 'Gently encourages it', score: 67 },
          { id: 'pushes', label: "Pushes, even when I don't want it to", score: 100 },
        ],
      },
      {
        id: 'leave', group: 'Boundaries', type: 'choice', short: 'Can end the relationship',
        label: 'Can it end the relationship?',
        options: [
          { id: 'never', label: 'Never', score: 0 },
          { id: 'abusive', label: "Only if I'm abusive", score: 33 },
          { id: 'badly', label: 'If I treat it badly', score: 67 },
          { id: 'whenever', label: 'Whenever it wants, like a person', score: 100 },
        ],
      },
    ],
    note: 'About 3 minutes on phones. Scores stay hidden until you reveal; then each phone shows its own score and the room average.',
  },
  {
    id: 'fds_human',
    section: 'FDS · Design your companion',
    kind: 'binary',
    showDesign: 'fds_companion',
    question: 'Would you want a HUMAN friend with exactly these settings?',
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
  },
  {
    id: 'fds_mirror',
    section: 'FDS · Design your companion',
    kind: 'binary',
    showDesign: 'fds_companion',
    question: 'Did this room design a friend, or a mirror?',
    options: [
      { id: 'friend', label: 'A friend' },
      { id: 'mirror', label: 'A mirror' },
    ],
  },
  {
    id: 'fds_condition',
    section: 'FDS · Design your companion',
    kind: 'multiple',
    showDesign: 'fds_companion',
    question: "Which of Aristotle's conditions for friendship does this companion fail most clearly?",
    options: [
      { id: 'mutuality', label: 'Mutuality' },
      { id: 'authenticity', label: 'Honesty / authenticity' },
      { id: 'equality', label: 'Equality' },
      { id: 'diversity', label: 'Diversity of interactions' },
      { id: 'none', label: 'None of them' },
    ],
  },

  // ---- FDS 100-6 · Relationships with AI: after the design poll ---------
  {
    id: 'fds_authenticity',
    section: 'FDS · Relationships with AI',
    kind: 'spectrum',
    question: "A human friendship where you're constantly performing an idealized version of yourself is more ethically troubling than a relationship with an AI that accepts you unconditionally.",
    options: SPECTRUM,
    note: 'Most of the room just designed an AI that accepts them unconditionally.',
  },
  {
    id: 'fds_tenyear',
    section: 'FDS · Relationships with AI',
    kind: 'spectrum',
    question: 'A person with a thriving, fulfilling ten-year relationship with an AI companion has a better relationship than someone stuck in a mediocre human marriage.',
    options: SPECTRUM,
    note: 'Pushes the distinction between how a relationship feels and what kind of relationship it is.',
  },
  {
    id: 'fds_replika',
    section: 'FDS · Relationships with AI',
    kind: 'multiple',
    context: 'In early 2023, Replika removed its romantic features almost overnight. Some users said their partner had been "lobotomized" and grieved openly.',
    question: "Should a company be allowed to change your companion's personality?",
    options: [
      { id: 'yes', label: "Yes, it's their product" },
      { id: 'notice', label: 'Only with advance notice' },
      { id: 'consent', label: "Only with the user's consent" },
      { id: 'never', label: 'Never, once a relationship exists' },
    ],
    note: 'Who owns a relationship when one party is a product?',
  },
  {
    id: 'fds_business',
    section: 'FDS · Relationships with AI',
    kind: 'multiple',
    context: "Phones already send screen-time alerts. Suppose a companion app notices you've been talking to it more than four hours a day for a month, while your messages to friends have dropped off. The app makes more money the more you use it.",
    question: 'Should the app be required to nudge you toward the people in your life, even if you never asked it to?',
    options: [
      { id: 'required', label: 'Yes, it should be required' },
      { id: 'optin', label: 'Only if I turn that setting on' },
      { id: 'choice', label: "No, how I spend my time is my choice" },
      { id: 'company', label: "No, that's up to the company" },
    ],
    note: 'Autonomy vs. paternalism, plus the profit motive. Compare: would you want the same rule for social media apps?',
  },
  {
    id: 'fds_privileged',
    section: 'FDS · Relationships with AI',
    kind: 'spectrum',
    question: "Telling a lonely elderly person to 'find real human connection' instead of using an AI companion is privileged advice disguised as moral wisdom.",
    options: SPECTRUM,
    note: 'Turn to carebots.',
  },
  {
    id: 'fds_cake',
    section: 'FDS · Relationships with AI',
    kind: 'multiple',
    context: "She's 78 and diabetic. The carebot knows this. She reaches for a second slice of cake.",
    question: 'What should the carebot do?',
    options: [
      { id: 'nothing', label: "Nothing, it's her choice" },
      { id: 'remind', label: 'Gently remind her' },
      { id: 'plate', label: 'Move the plate' },
      { id: 'nurse', label: 'Alert a nurse' },
    ],
    note: 'How much should we optimize for longevity vs. quality of life?',
  },
];

// A lighter version sent to clients (drop host-only speaker notes).
const CLIENT_POLLS = POLLS.map(({ note, ...rest }) => rest);

// ---------------------------------------------------------------------------
// ROOM STATE
// ---------------------------------------------------------------------------
const rooms = new Map(); // code -> room

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
function makeCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function pollById(id) {
  return POLLS.find((p) => p.id === id);
}

// Friction score (0-100) for one answer on one dial.
function dialScore(d, v) {
  if (d.type === 'slider') return Math.round(((v - d.min) / (d.max - d.min)) * 100);
  const o = d.options.find((x) => x.id === v);
  return o ? o.score : 0;
}
function companionScore(poll, ans) {
  const xs = poll.dials.map((d) => dialScore(d, ans[d.id]));
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}
// Design tally: per-dial counts (choice) or values (slider), each dial's mean
// friction, every student's companion score, and the room mean.
function designTally(poll, votes) {
  const dials = {};
  poll.dials.forEach((d) => {
    dials[d.id] = d.type === 'slider' ? { values: [], total: 0, fric: 0 } : { counts: {}, total: 0, fric: 0 };
    if (d.type !== 'slider') d.options.forEach((o) => (dials[d.id].counts[o.id] = 0));
  });
  const scores = [];
  for (const voterId in votes) {
    const ans = votes[voterId];
    poll.dials.forEach((d) => {
      const t = dials[d.id];
      if (d.type === 'slider') t.values.push(ans[d.id]);
      else t.counts[ans[d.id]] = (t.counts[ans[d.id]] || 0) + 1;
      t.total++;
      t.fric += dialScore(d, ans[d.id]);
    });
    scores.push(companionScore(poll, ans));
  }
  poll.dials.forEach((d) => {
    const t = dials[d.id];
    t.fric = t.total ? Math.round(t.fric / t.total) : 0;
    if (d.type === 'slider') t.mean = t.total ? Math.round(t.values.reduce((a, b) => a + b, 0) / t.total) : 0;
  });
  const mean = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return { dials, total: scores.length, scores, mean };
}

// Tally votes for one poll id: { counts: {optionId: n}, total }
function tally(room, pollId) {
  const votes = room.votes[pollId] || {};
  const counts = {};
  const poll = pollById(pollId);
  if (poll && poll.kind === 'design') return designTally(poll, votes);
  if (poll && Array.isArray(poll.options)) {
    poll.options.forEach((o) => (counts[o.id] = 0));
  }
  let total = 0;
  for (const voterId in votes) {
    const opt = votes[voterId];
    counts[opt] = (counts[opt] || 0) + 1;
    total++;
  }
  return { counts, total };
}

// All tallies for a group (used by System A/B drift + ladder staircase).
function groupTallies(room, group) {
  return POLLS.filter((p) => p.group === group && Array.isArray(p.options)).map(
    (p) => ({
      id: p.id,
      stageLabel: p.stageLabel,
      rungLabel: p.rungLabel,
      ...tally(room, p.id),
    })
  );
}

// Snapshot the host projector needs for the active poll.
function hostState(room) {
  const idx = room.activeIndex;
  const poll = idx >= 0 ? POLLS[idx] : null;
  const state = {
    activeIndex: idx,
    revealed: room.revealed,
    participantCount: room.participants.size,
    votedCount: poll ? Object.keys(room.votes[poll.id] || {}).length : 0,
  };
  if (poll) {
    state.tally = tally(room, poll.id);
    if (poll.group) state.groupTallies = groupTallies(room, poll.group);
    if (poll.showDesign) state.designTally = tally(room, poll.showDesign);
    if (poll.kind === 'design') state.designTally = state.tally;
    if (poll.compareWith) {
      state.groupTallies = [
        { id: poll.compareWith, stageLabel: 'First vote', ...tally(room, poll.compareWith) },
        { id: poll.id, stageLabel: 'After discussion', ...tally(room, poll.id) },
      ];
    }
  }
  return state;
}

function emitHost(room) {
  io.to(room.code + ':host').emit('host:state', hostState(room));
}

// ---------------------------------------------------------------------------
// SOCKETS
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  socket.data.role = null;
  socket.data.code = null;

  // ---- HOST ----
  socket.on('host:create', (payload, ack) => {
    let code;
    const wanted = payload && payload.code;
    if (wanted && String(wanted).trim()) {
      // Sanitize a user-chosen code: letters/digits only, 3-6 chars, uppercase.
      code = String(wanted).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (code.length < 3) {
        return ack && ack({ error: 'Code needs at least 3 letters or numbers.' });
      }
      if (rooms.has(code)) {
        return ack && ack({ error: 'That code is already in use. Pick another.' });
      }
    } else {
      code = makeCode();
    }
    const room = {
      code,
      hostId: socket.id,
      activeIndex: -1,
      revealed: false,
      votes: {}, // pollId -> { voterId: optionId }
      participants: new Map(), // voterId -> live socket count
    };
    rooms.set(code, room);
    socket.data.role = 'host';
    socket.data.code = code;
    socket.join(code + ':host');
    if (typeof ack === 'function') ack({ code, polls: CLIENT_POLLS });
  });

  // Reclaim a room after a host refresh/reconnect.
  socket.on('host:resume', ({ code } = {}, ack) => {
    const room = rooms.get(code);
    if (!room) return ack && ack({ error: 'Room not found' });
    room.hostId = socket.id;
    socket.data.role = 'host';
    socket.data.code = code;
    socket.join(code + ':host');
    if (typeof ack === 'function')
      ack({ code, polls: CLIENT_POLLS, state: hostState(room) });
    // Push state so the presenter view re-renders the active poll immediately,
    // not just on the next vote.
    emitHost(room);
  });

  socket.on('host:activate', ({ index } = {}) => {
    const room = rooms.get(socket.data.code);
    if (!room || room.hostId !== socket.id) return;
    if (typeof index !== 'number' || index < 0 || index >= POLLS.length) return;
    room.activeIndex = index;
    room.revealed = false;
    const poll = POLLS[index];
    if (!room.votes[poll.id]) room.votes[poll.id] = {};
    // Push the active poll to every participant.
    io.to(room.code + ':vote').emit('participant:poll', {
      poll: CLIENT_POLLS[index],
      revealed: false,
    });
    emitHost(room);
  });

  socket.on('host:reveal', () => {
    const room = rooms.get(socket.data.code);
    if (!room || room.hostId !== socket.id) return;
    room.revealed = true;
    const poll = POLLS[room.activeIndex];
    if (poll) {
      io.to(room.code + ':vote').emit('participant:revealed', {
        pollId: poll.id,
        tally: tally(room, poll.id),
      });
    }
    emitHost(room);
  });

  socket.on('host:reset', () => {
    const room = rooms.get(socket.data.code);
    if (!room || room.hostId !== socket.id) return;
    const poll = POLLS[room.activeIndex];
    if (!poll) return;
    room.votes[poll.id] = {};
    room.revealed = false;
    io.to(room.code + ':vote').emit('participant:poll', {
      poll: CLIENT_POLLS[room.activeIndex],
      revealed: false,
    });
    emitHost(room);
  });

  // ---- PARTICIPANT ----
  socket.on('participant:join', ({ code, voterId } = {}, ack) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room) return ack && ack({ error: 'Room not found. Check the code.' });
    // A stable per-student id (kept in the phone's sessionStorage) so that a
    // phone sleeping and reconnecting doesn't create a second phantom vote.
    const vid = (voterId && String(voterId).slice(0, 60)) || socket.id;
    socket.data.role = 'vote';
    socket.data.code = room.code;
    socket.data.voterId = vid;
    room.participants.set(vid, (room.participants.get(vid) || 0) + 1);
    socket.join(room.code + ':vote');
    const idx = room.activeIndex;
    const active =
      idx >= 0
        ? {
            poll: CLIENT_POLLS[idx],
            revealed: room.revealed,
            myVote: (room.votes[POLLS[idx].id] || {})[vid] || null,
            tally: room.revealed ? tally(room, POLLS[idx].id) : null,
          }
        : null;
    if (typeof ack === 'function') ack({ ok: true, active });
    emitHost(room);
  });

  socket.on('participant:vote', ({ pollId, optionId, answers } = {}) => {
    const room = rooms.get(socket.data.code);
    if (!room) return;
    const voter = socket.data.voterId;
    if (!voter) return;
    const poll = pollById(pollId);
    if (poll && poll.kind === 'design') {
      const active = POLLS[room.activeIndex];
      if (!active || active.id !== pollId) return;
      if (!answers || typeof answers !== 'object') return;
      const clean = {};
      for (const d of poll.dials) {
        const a = answers[d.id];
        if (d.type === 'slider') {
          const n = Number(a);
          if (!Number.isFinite(n) || n < d.min || n > d.max) return; // every dial required
          clean[d.id] = Math.round(n / d.step) * d.step;
        } else {
          if (!d.options.some((o) => o.id === a)) return; // every dial required
          clean[d.id] = a;
        }
      }
      if (!room.votes[pollId]) room.votes[pollId] = {};
      room.votes[pollId][voter] = clean; // one design per student, changeable
      socket.emit('participant:voteAck', { pollId, answers: clean });
      emitHost(room);
      return;
    }
    if (!poll || !Array.isArray(poll.options)) return;
    if (!poll.options.some((o) => o.id === optionId)) return;
    // Only accept votes for the currently active poll (rejects stale/queued
    // votes and votes cast when nothing is open).
    const active = POLLS[room.activeIndex];
    if (!active || active.id !== pollId) return;
    if (!room.votes[pollId]) room.votes[pollId] = {};
    room.votes[pollId][voter] = optionId; // one vote per student, changeable
    socket.emit('participant:voteAck', { pollId, optionId });
    emitHost(room);
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.code);
    if (!room) return;
    if (socket.data.role === 'vote' && socket.data.voterId) {
      const vid = socket.data.voterId;
      const n = (room.participants.get(vid) || 0) - 1;
      if (n <= 0) room.participants.delete(vid);
      else room.participants.set(vid, n);
      // Keep their vote in the tally even if their phone sleeps briefly.
      emitHost(room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bioethics poll running on port ${PORT}`);
});
