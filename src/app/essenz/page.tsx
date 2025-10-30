"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

interface NodePosition {
  x: number;
  y: number;
}

interface EssenzNodeData {
  id: string;
  type: "goal" | "steps" | "prioritize" | "todo" | "diary" | "resources" | "watchlist" | "hopin";
  title: string;
  icon: string;
  position: NodePosition;
  expanded: boolean;
  data: Record<string, any>;
}

interface GoalData {
  statement: string;
  focusAreas: string[];
  plan: { title: string; steps: string[] }[];
  codename: string;
}

interface StepData {
  steps: { id: string; title: string; duration: string; difficulty: "EASY" | "MEDIUM" | "HARD"; completed: boolean }[];
}

interface PriorityData {
  tasks: { id: string; title: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; completed: boolean }[];
}

interface TodoData {
  todos: { id: string; title: string; completed: boolean; time?: string; note?: string; postponed?: number }[];
}

interface DiaryData {
  entries: { id: string; timestamp: Date; text: string; mood?: string; tags: string[] }[];
}

interface ResourceData {
  resources: {
    id: string;
    type: "PODCAST" | "VIDEO" | "BOOK" | "WEBSITE" | "COURSE";
    title: string;
    url?: string;
    notes?: string;
  }[];
}

interface WatchlistData {
  items: {
    id: string;
    type: "MOVIE" | "SERIES" | "DOCUMENTARY";
    title: string;
    status: "PLANNING" | "WATCHING" | "COMPLETED";
    watchWith: string[];
    tags: string[];
  }[];
}

interface HopinData {
  plans: { id: string; day: string; goal: string; habit?: string; completed: boolean }[];
}

// ============================================================================
// COMPONENTS
// ============================================================================

function GoalNode({ data, onUpdate, essenzId }: { data: GoalData; onUpdate: (data: GoalData) => void; essenzId: string | null }) {
  const [statement, setStatement] = useState(data.statement || "");
  const [codename, setCodename] = useState(data.codename || "");
  const [showCodename, setShowCodename] = useState(!!data.codename);
  const [plan, setPlan] = useState(data.plan || []);

  const generatePlan = () => {
    if (!statement.trim()) return;

    // Simple AI simulation - in production, call actual AI API
    const focusAreas = ["Daily practice", "Track progress", "Review weekly", "Adjust strategy"];
    const generatedPlan = [
      { title: "Foundation", steps: ["Define specifics", "Set timeline", "Identify resources"] },
      { title: "Execution", steps: ["Create schedule", "Start small", "Build momentum"] },
      { title: "Optimization", steps: ["Measure results", "Get feedback", "Refine approach"] },
    ];

    setPlan(generatedPlan);
    onUpdate({ ...data, statement, plan: generatedPlan, focusAreas, codename });
  };

  return (
    <div className="space-y-4">
      <textarea
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        placeholder="What do you want to achieve? (2-3 lines)..."
        className="w-full px-4 py-3 border-2 border-blue-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        rows={3}
      />

      {showCodename && (
        <input
          type="text"
          value={codename}
          onChange={(e) => setCodename(e.target.value)}
          placeholder="Give it a codename (optional)..."
          className="w-full px-4 py-2 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      )}

      {!showCodename && statement && (
        <button
          onClick={() => setShowCodename(true)}
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
        >
          + Give it a codename
        </button>
      )}

      <button
        onClick={generatePlan}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-2xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all"
      >
        🤖 Generate Personalized Plan
      </button>

      {plan.length > 0 && (
        <div className="space-y-3 pt-3 border-t-2 border-blue-100">
          <h4 className="font-bold text-sm text-slate-800">Your Blueprint:</h4>
          {plan.map((phase, idx) => (
            <div key={idx} className="bg-blue-50 rounded-2xl p-3">
              <p className="font-bold text-sm text-blue-900">{phase.title}</p>
              <ul className="text-xs text-slate-700 mt-2 space-y-1">
                {phase.steps.map((step, i) => (
                  <li key={i}>• {step}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepsNode({ data, onUpdate, essenzId }: { data: StepData; onUpdate: (data: StepData) => void; essenzId: string | null }) {
  const [steps, setSteps] = useState(data.steps || []);
  const [newStep, setNewStep] = useState("");

  const addStep = async () => {
    if (!newStep.trim()) return;
    const newSteps = [...steps, { id: Date.now().toString(), title: newStep, duration: "", difficulty: "MEDIUM" as const, completed: false }];
    setSteps(newSteps);
    onUpdate({ steps: newSteps });

    // Save to backend
    if (essenzId) {
      try {
        await fetch(`/api/essenz/${essenzId}/steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newStep.trim(), difficulty: "MEDIUM" }),
        });
      } catch (err) {
        console.error("Failed to save step:", err);
      }
    }
    setNewStep("");
  };

  const toggleComplete = async (id: string) => {
    const updated = steps.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
    setSteps(updated);
    onUpdate({ steps: updated });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addStep()}
          placeholder="Add a step..."
          className="flex-1 px-3 py-2 border-2 border-green-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
        />
        <button
          onClick={addStep}
          className="bg-green-500 text-white px-4 py-2 rounded-2xl font-bold hover:bg-green-600 transition-all"
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2 p-3 bg-green-50 rounded-2xl">
            <input
              type="checkbox"
              checked={step.completed}
              onChange={() => toggleComplete(step.id)}
              className="w-5 h-5 cursor-pointer"
            />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${step.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                Step {idx + 1}: {step.title}
              </p>
              <select
                value={step.difficulty}
                onChange={(e) => {
                  const updated = steps.map((s) =>
                    s.id === step.id ? { ...s, difficulty: e.target.value as any } : s
                  );
                  setSteps(updated);
                  onUpdate({ steps: updated });
                }}
                className="text-xs mt-1 px-2 py-1 border border-green-200 rounded"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrioritizeNode({ data, onUpdate, essenzId }: { data: PriorityData; onUpdate: (data: PriorityData) => void; essenzId: string | null }) {
  const [tasks, setTasks] = useState(data.tasks || []);
  const [newTask, setNewTask] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const addTask = () => {
    if (!newTask.trim()) return;
    const newTasks = [...tasks, { id: Date.now().toString(), title: newTask, priority: "MEDIUM" as const, completed: false }];
    setTasks(newTasks);
    onUpdate({ tasks: newTasks });
    setNewTask("");
  };

  const moveTask = (fromIdx: number, toIdx: number) => {
    const newTasks = [...tasks];
    const [removed] = newTasks.splice(fromIdx, 1);
    newTasks.splice(toIdx, 0, removed);
    setTasks(newTasks);
    onUpdate({ tasks: newTasks });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 border-red-300 text-red-900";
      case "HIGH":
        return "bg-orange-100 border-orange-300 text-orange-900";
      case "MEDIUM":
        return "bg-yellow-100 border-yellow-300 text-yellow-900";
      default:
        return "bg-green-100 border-green-300 text-green-900";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addTask()}
          placeholder="Add priority..."
          className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
        <button
          onClick={addTask}
          className="bg-purple-500 text-white px-4 py-2 rounded-2xl font-bold hover:bg-purple-600 transition-all"
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => setDraggedId(task.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const draggedIdx = tasks.findIndex((t) => t.id === draggedId);
              if (draggedIdx !== -1) moveTask(draggedIdx, idx);
            }}
            className={`p-3 rounded-2xl border-2 cursor-move transition-all ${getPriorityColor(task.priority)} ${
              draggedId === task.id ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">#{idx + 1} {task.title}</p>
              <select
                value={task.priority}
                onChange={(e) => {
                  const updated = tasks.map((t) =>
                    t.id === task.id ? { ...t, priority: e.target.value as any } : t
                  );
                  setTasks(updated);
                  onUpdate({ tasks: updated });
                }}
                className="text-xs px-2 py-1 rounded border-0 bg-white/50"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <p className="text-xs mt-1 opacity-75">💡 {["Break it smaller", "Set a deadline", "Find a buddy"][Math.floor(Math.random() * 3)]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodoNode({ data, onUpdate, essenzId }: { data: TodoData; onUpdate: (data: TodoData) => void; essenzId: string | null }) {
  const [todos, setTodos] = useState(data.todos || []);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    const newTodos = [...todos, { id: Date.now().toString(), title: newTodo, completed: false, time: "", note: "", postponed: 0 }];
    setTodos(newTodos);
    onUpdate({ todos: newTodos });

    // Save to backend
    if (essenzId) {
      try {
        await fetch(`/api/essenz/${essenzId}/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTodo.trim() }),
        });
      } catch (err) {
        console.error("Failed to save todo:", err);
      }
    }
    setNewTodo("");
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTodos(updated);
    onUpdate({ todos: updated });
  };

  const postponeTodo = (id: string) => {
    const updated = todos.map((t) =>
      t.id === id ? { ...t, postponed: (t.postponed || 0) + 1 } : t
    );
    setTodos(updated);
    onUpdate({ todos: updated });
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="w-full bg-yellow-100 rounded-full h-2 border-2 border-yellow-300">
        <div
          className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs font-bold text-center text-yellow-900">{completedCount}/{todos.length} completed ({progress}%)</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add a task for today..."
          className="flex-1 px-3 py-2 border-2 border-yellow-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
        />
        <button
          onClick={addTodo}
          className="bg-yellow-500 text-white px-4 py-2 rounded-2xl font-bold hover:bg-yellow-600 transition-all"
        >
          +
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {todos.map((todo) => (
          <div key={todo.id} className="flex items-center gap-2 p-3 bg-yellow-50 rounded-2xl border-2 border-yellow-200">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              className="w-5 h-5 cursor-pointer"
            />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${todo.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                {todo.title}
              </p>
              {todo.postponed > 0 && <p className="text-xs text-orange-600 mt-1">Postponed {todo.postponed}x</p>}
            </div>
            {!todo.completed && (
              <button
                onClick={() => postponeTodo(todo.id)}
                className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-semibold hover:bg-orange-200"
              >
                ⏱️ Later
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiaryNode({ data, onUpdate, essenzId }: { data: DiaryData; onUpdate: (data: DiaryData) => void; essenzId: string | null }) {
  const [entries, setEntries] = useState(data.entries || []);
  const [text, setText] = useState("");
  const [mood, setMood] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setText((prev) => prev + " " + transcript);
            } else {
              interim += transcript;
            }
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };

        setRecognition(rec);
      }
    }
  }, []);

  const startRecording = () => {
    if (recognition) {
      setIsRecording(true);
      recognition.start();
    }
  };

  const stopRecording = () => {
    if (recognition) {
      setIsRecording(false);
      recognition.stop();
    }
  };

  const addEntry = async () => {
    if (!text.trim()) return;
    const newEntries = [
      {
        id: Date.now().toString(),
        timestamp: new Date(),
        text,
        mood,
        tags: [],
      },
      ...entries,
    ];
    setEntries(newEntries);
    onUpdate({ entries: newEntries });

    // Save to backend
    if (essenzId) {
      try {
        await fetch(`/api/essenz/${essenzId}/diary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text.trim(), mood, tags: [] }),
        });
      } catch (err) {
        console.error("Failed to save diary entry:", err);
      }
    }
    setText("");
    setMood("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your thoughts..."
          className="flex-1 px-3 py-2 border-2 border-pink-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm resize-none"
          rows={2}
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-3 py-2 rounded-2xl font-bold text-white transition-all ${
              isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-pink-500 hover:bg-pink-600"
            }`}
          >
            🎤
          </button>
          <button
            onClick={addEntry}
            className="px-3 py-2 rounded-2xl font-bold text-white bg-pink-600 hover:bg-pink-700 transition-all"
          >
            ✓
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {["😊", "😐", "😢", "😴", "😤"].map((emoji) => (
          <button
            key={emoji}
            onClick={() => setMood(emoji)}
            className={`text-2xl p-2 rounded-2xl transition-all ${mood === emoji ? "bg-pink-200 scale-110" : "hover:bg-pink-100"}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {entries.slice(0, 5).map((entry) => (
          <div key={entry.id} className="p-3 bg-pink-50 rounded-2xl border-2 border-pink-200">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-pink-900">
                {entry.timestamp.toLocaleTimeString()}
              </p>
              {entry.mood && <span className="text-lg">{entry.mood}</span>}
            </div>
            <p className="text-sm text-slate-800 line-clamp-2">{entry.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourcesNode({ data, onUpdate, essenzId }: { data: ResourceData; onUpdate: (data: ResourceData) => void; essenzId: string | null }) {
  const [resources, setResources] = useState(data.resources || []);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"PODCAST" | "VIDEO" | "BOOK" | "WEBSITE" | "COURSE">("PODCAST");
  const [url, setUrl] = useState("");

  const addResource = async () => {
    if (!title.trim()) return;
    const newResources = [
      ...resources,
      { id: Date.now().toString(), type, title, url: url || undefined, notes: "" },
    ];
    setResources(newResources);
    onUpdate({ resources: newResources });

    // Save to backend
    if (essenzId) {
      try {
        await fetch(`/api/essenz/${essenzId}/resources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), type, url: url || undefined }),
        });
      } catch (err) {
        console.error("Failed to save resource:", err);
      }
    }
    setTitle("");
    setUrl("");
  };

  const icons: Record<string, string> = {
    PODCAST: "🎙️",
    VIDEO: "📹",
    BOOK: "📚",
    WEBSITE: "🌐",
    COURSE: "🎓",
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resource title..."
          className="w-full px-3 py-2 border-2 border-indigo-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
        <div className="grid grid-cols-5 gap-1">
          {(Object.keys(icons) as Array<"PODCAST" | "VIDEO" | "BOOK" | "WEBSITE" | "COURSE">).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`p-2 rounded-lg text-lg transition-all ${
                type === t ? "bg-indigo-500 text-white" : "bg-indigo-100 hover:bg-indigo-200"
              }`}
            >
              {icons[t]}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL (optional)..."
          className="w-full px-3 py-2 border-2 border-indigo-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
        <button
          onClick={addResource}
          className="w-full bg-indigo-500 text-white py-2 rounded-2xl font-bold hover:bg-indigo-600 transition-all"
        >
          + Add Resource
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {resources.map((res) => (
          <div key={res.id} className="p-3 bg-indigo-50 rounded-2xl border-2 border-indigo-200">
            <div className="flex items-start gap-2">
              <span className="text-2xl">{icons[res.type]}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{res.title}</p>
                <p className="text-xs text-indigo-600">{res.type}</p>
                {res.url && (
                  <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1">
                    Open →
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchlistNode({ data, onUpdate, essenzId }: { data: WatchlistData; onUpdate: (data: WatchlistData) => void; essenzId: string | null }) {
  const [items, setItems] = useState(data.items || []);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"MOVIE" | "SERIES" | "DOCUMENTARY">("MOVIE");

  const addItem = () => {
    if (!title.trim()) return;
    const newItems = [
      ...items,
      { id: Date.now().toString(), type, title, status: "PLANNING" as const, watchWith: [], tags: [] },
    ];
    setItems(newItems);
    onUpdate({ items: newItems });
    setTitle("");
  };

  const updateStatus = (id: string, status: "PLANNING" | "WATCHING" | "COMPLETED") => {
    const updated = items.map((i) => (i.id === id ? { ...i, status } : i));
    setItems(updated);
    onUpdate({ items: updated });
  };

  const icons: Record<string, string> = {
    MOVIE: "🎬",
    SERIES: "📺",
    DOCUMENTARY: "🎥",
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title..."
          className="w-full px-3 py-2 border-2 border-red-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
        />
        <div className="flex gap-2">
          {(["MOVIE", "SERIES", "DOCUMENTARY"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 p-2 rounded-lg text-sm font-bold transition-all ${
                type === t ? "bg-red-500 text-white" : "bg-red-100 hover:bg-red-200"
              }`}
            >
              {icons[t]} {t}
            </button>
          ))}
        </div>
        <button
          onClick={addItem}
          className="w-full bg-red-500 text-white py-2 rounded-2xl font-bold hover:bg-red-600 transition-all"
        >
          + Add to Watchlist
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="p-3 bg-red-50 rounded-2xl border-2 border-red-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-800">{icons[item.type]} {item.title}</p>
              <select
                value={item.status}
                onChange={(e) => updateStatus(item.id, e.target.value as any)}
                className="text-xs px-2 py-1 rounded border-0 bg-white/50"
              >
                <option value="PLANNING">Planning</option>
                <option value="WATCHING">Watching</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <p className="text-xs text-red-600">👥 Watch with others - tags visible in chat</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HopinNode({ data, onUpdate, essenzId }: { data: HopinData; onUpdate: (data: HopinData) => void; essenzId: string | null }) {
  const [plans, setPlans] = useState(data.plans || []);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [goal, setGoal] = useState("");
  const [habit, setHabit] = useState("");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const addPlan = () => {
    if (!goal.trim()) return;
    const newPlans = [...plans, { id: Date.now().toString(), day: selectedDay, goal, habit, completed: false }];
    setPlans(newPlans);
    onUpdate({ plans: newPlans });
    setGoal("");
    setHabit("");
  };

  const toggleComplete = (id: string) => {
    const updated = plans.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p));
    setPlans(updated);
    onUpdate({ plans: updated });
  };

  const dayPlans = plans.filter((p) => p.day === selectedDay);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-3 py-1 rounded-2xl font-bold text-xs whitespace-nowrap transition-all ${
              selectedDay === day ? "bg-cyan-500 text-white" : "bg-cyan-100 text-cyan-900 hover:bg-cyan-200"
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Weekly goal..."
          className="w-full px-3 py-2 border-2 border-cyan-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
        <input
          type="text"
          value={habit}
          onChange={(e) => setHabit(e.target.value)}
          placeholder="Habit to track..."
          className="w-full px-3 py-2 border-2 border-cyan-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
        <button
          onClick={addPlan}
          className="w-full bg-cyan-500 text-white py-2 rounded-2xl font-bold hover:bg-cyan-600 transition-all"
        >
          + Add Plan
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {dayPlans.map((plan) => (
          <div
            key={plan.id}
            className="p-3 bg-cyan-50 rounded-2xl border-2 border-cyan-200 flex items-start gap-2"
          >
            <input
              type="checkbox"
              checked={plan.completed}
              onChange={() => toggleComplete(plan.id)}
              className="w-5 h-5 cursor-pointer mt-0.5"
            />
            <div className="flex-1">
              <p className={`text-sm font-bold ${plan.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                {plan.goal}
              </p>
              {plan.habit && (
                <p className="text-xs text-cyan-700 mt-1">🔄 {plan.habit}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function EssenzPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [nodes, setNodes] = useState<EssenzNodeData[]>([
    {
      id: "goal",
      type: "goal",
      title: "What's Your Goal?",
      icon: "🎯",
      position: { x: 50, y: 15 },
      expanded: true,
      data: {} as GoalData,
    },
    {
      id: "steps",
      type: "steps",
      title: "Break It Down",
      icon: "🪜",
      position: { x: 50, y: 35 },
      expanded: false,
      data: {} as StepData,
    },
    {
      id: "prioritize",
      type: "prioritize",
      title: "Prioritize",
      icon: "📊",
      position: { x: 20, y: 55 },
      expanded: false,
      data: {} as PriorityData,
    },
    {
      id: "todo",
      type: "todo",
      title: "Today's Tasks",
      icon: "✅",
      position: { x: 50, y: 55 },
      expanded: false,
      data: {} as TodoData,
    },
    {
      id: "diary",
      type: "diary",
      title: "My Diary",
      icon: "📔",
      position: { x: 80, y: 55 },
      expanded: false,
      data: {} as DiaryData,
    },
    {
      id: "resources",
      type: "resources",
      title: "Tools & Resources",
      icon: "🔧",
      position: { x: 20, y: 75 },
      expanded: false,
      data: {} as ResourceData,
    },
    {
      id: "watchlist",
      type: "watchlist",
      title: "Watch Together",
      icon: "🎬",
      position: { x: 50, y: 75 },
      expanded: false,
      data: {} as WatchlistData,
    },
    {
      id: "hopin",
      type: "hopin",
      title: "This Week",
      icon: "📅",
      position: { x: 80, y: 75 },
      expanded: false,
      data: {} as HopinData,
    },
  ]);

  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [codenameSet, setCodenameSet] = useState(false);
  const [essenzId, setEssenzId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load essenz data on mount
  useEffect(() => {
    const loadEssenzData = async () => {
      try {
        const res = await fetch("/api/essenz");
        if (res.ok) {
          const { goals } = await res.json();
          if (goals.length > 0) {
            const essenz = goals[0];
            setEssenzId(essenz.id);

            // Load all node data from backend
            const [stepsRes, todosRes, diaryRes, resourcesRes, watchlistRes] = await Promise.all([
              fetch(`/api/essenz/${essenz.id}/steps`),
              fetch(`/api/essenz/${essenz.id}/todos`),
              fetch(`/api/essenz/${essenz.id}/diary`),
              fetch(`/api/essenz/${essenz.id}/resources`),
              fetch(`/api/essenz/${essenz.id}/watchlist`),
            ]);

            if (stepsRes.ok) {
              const { steps } = await stepsRes.json();
              setNodes((prev) => prev.map((n) => (n.id === "steps" ? { ...n, data: { steps } } : n)));
            }
            if (todosRes.ok) {
              const { todos } = await todosRes.json();
              setNodes((prev) => prev.map((n) => (n.id === "todo" ? { ...n, data: { todos } } : n)));
            }
            if (diaryRes.ok) {
              const { entries } = await diaryRes.json();
              setNodes((prev) => prev.map((n) => (n.id === "diary" ? { ...n, data: { entries } } : n)));
            }
            if (resourcesRes.ok) {
              const { resources } = await resourcesRes.json();
              setNodes((prev) => prev.map((n) => (n.id === "resources" ? { ...n, data: { resources } } : n)));
            }
            if (watchlistRes.ok) {
              const { items } = await watchlistRes.json();
              setNodes((prev) => prev.map((n) => (n.id === "watchlist" ? { ...n, data: { items } } : n)));
            }

            // Load goal data
            if (essenz.goal) {
              setNodes((prev) =>
                prev.map((n) =>
                  n.id === "goal"
                    ? {
                        ...n,
                        data: {
                          statement: essenz.goal || "",
                          focusAreas: essenz.focusAreas || [],
                          plan: essenz.plan || [],
                          codename: essenz.codename || "",
                        } as GoalData,
                      }
                    : n
                )
              );
              if (essenz.codename) {
                setCodenameSet(true);
              }
            }
          } else {
            // Create new essenz goal if none exists
            const createRes = await fetch("/api/essenz", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "My Goal", goal: "" }),
            });
            if (createRes.ok) {
              const { goal } = await createRes.json();
              setEssenzId(goal.id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load essenz data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEssenzData();
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4 animate-pulse">✨</p>
          <h1 className="text-4xl font-bold text-white mb-2">Essenz</h1>
          <p className="text-slate-300 mb-8">Your Personal Goal Achievement System</p>
          <Link
            href="/join"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const toggleNode = (id: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, expanded: !n.expanded } : n)));
  };

  const updateNodeData = useCallback(
    async (id: string, data: any) => {
      // Update local state immediately for UI responsiveness
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data } : n)));

      if (!essenzId) return;

      // Save to backend based on node type
      try {
        if (id === "goal") {
          await fetch(`/api/essenz/${essenzId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              goal: data.statement,
              codename: data.codename,
              plan: data.plan,
              focusAreas: data.focusAreas,
            }),
          });
          if (data.codename && !codenameSet) {
            setCodenameSet(true);
          }
        }
      } catch (err) {
        console.error("Failed to update essenz data:", err);
      }
    },
    [essenzId, codenameSet]
  );

  const handleNodeDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNode(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleNodeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNode) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const container = (e.target as HTMLElement).closest("[data-canvas]");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;

    setNodes((prev) =>
      prev.map((n) =>
        n.id === draggedNode
          ? { ...n, position: { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } }
          : n
      )
    );
    setDraggedNode(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-slate-200 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">✨</div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Essenz</h1>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                  {codenameSet ? "Your Personal System" : "Personal Goal Achievement"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-2xl hover:bg-blue-100 transition-all"
              >
                💬 Chat
              </Link>
              <Link
                href="/profile"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg"
              >
                {session.user?.name?.charAt(0) || "U"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        data-canvas
        className="relative w-full min-h-[calc(100vh-100px)] overflow-auto"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(100, 116, 139, 0.08) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
          backgroundColor: "#f8fafc",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleNodeDrop}
      >
        <div className="relative" style={{ minHeight: "1200px" }}>
          {nodes.map((node) => {
            const colorMap: Record<string, string> = {
              goal: "from-blue-500 to-blue-600",
              steps: "from-green-500 to-green-600",
              prioritize: "from-purple-500 to-purple-600",
              todo: "from-yellow-500 to-yellow-600",
              diary: "from-pink-500 to-pink-600",
              resources: "from-indigo-500 to-indigo-600",
              watchlist: "from-red-500 to-red-600",
              hopin: "from-cyan-500 to-cyan-600",
            };

            return (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleNodeDragStart(e, node.id)}
                className="absolute transition-all duration-200 cursor-move group"
                style={{
                  left: `${node.position.x}%`,
                  top: `${node.position.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: draggedNode === node.id ? 50 : 10,
                }}
              >
                <div
                  className={`
                    w-72 bg-white rounded-3xl shadow-lg hover:shadow-2xl
                    border-2 border-slate-200 hover:border-slate-300
                    overflow-hidden transition-all duration-300
                    ${draggedNode === node.id ? "ring-2 ring-blue-500 opacity-90 scale-105" : ""}
                  `}
                >
                  {/* Header */}
                  <div
                    className={`bg-gradient-to-r ${colorMap[node.type]} p-4 text-white relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 opacity-10 animate-pulse" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl drop-shadow">{node.icon}</span>
                        <h3 className="font-black text-lg">{node.title}</h3>
                      </div>
                      <button
                        onClick={() => toggleNode(node.id)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-all"
                      >
                        <svg
                          className={`w-6 h-6 transition-transform ${node.expanded ? "rotate-180" : ""}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      node.expanded ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <div className="p-4 space-y-3">
                      {node.type === "goal" && (
                        <GoalNode
                          data={node.data as GoalData}
                          onUpdate={(data) => updateNodeData(node.id, data)}
                          essenzId={essenzId}
                        />
                      )}
                      {node.type === "steps" && (
                        <StepsNode
                          data={node.data as StepData}
                          onUpdate={(data) => updateNodeData(node.id, data)}
                          essenzId={essenzId}
                        />
                      )}
                      {node.type === "prioritize" && (
                        <PrioritizeNode
                          data={node.data as PriorityData}
                          onUpdate={(data) => updateNodeData(node.id, data)}
                          essenzId={essenzId}
                        />
                      )}
                      {node.type === "todo" && (
                        <TodoNode
                          data={node.data as TodoData}
                          onUpdate={(data) => updateNodeData(node.id, data)}
                          essenzId={essenzId}
                        />
                      )}
                      {node.type === "diary" && (
                        <DiaryNode
                          data={node.data as DiaryData}
                          onUpdate={(data) => updateNodeData(node.id, data)}
                          essenzId={essenzId}
                        />
                      )}
                      {node.type === "resources" && (
                        <ResourcesNode
                          data={node.data as ResourceData}
                          onUpdate={(data) => updateNodeData(node.id, data)}
                          essenzId={essenzId}
                        />
                      )}
                      {node.type === "watchlist" && (
                        <WatchlistNode
                          data={node.data as WatchlistData}
                          onUpdate={(data) => updateNodeData(node.id, data)}
                          essenzId={essenzId}
                        />
                      )}
                      {node.type === "hopin" && (
                        <HopinNode
                          data={node.data as HopinData}
                          onUpdate={(data) => updateNodeData(node.id, data)}
                          essenzId={essenzId}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Footer */}
      <div className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-4 max-w-xs animate-pulse">
        <p className="text-sm font-bold text-slate-800">
          ✋ Drag to move • Click to expand • Voice to record
        </p>
      </div>
    </div>
  );
}
