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

// Tally votes for one poll id: { counts: {optionId: n}, total }
function tally(room, pollId) {
  const votes = room.votes[pollId] || {};
  const counts = {};
  const poll = pollById(pollId);
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

  socket.on('participant:vote', ({ pollId, optionId } = {}) => {
    const room = rooms.get(socket.data.code);
    if (!room) return;
    const voter = socket.data.voterId;
    if (!voter) return;
    const poll = pollById(pollId);
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
