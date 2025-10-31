"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
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
// NODE COMPONENTS
// ============================================================================

function GoalNode({ data, onUpdate }: { data: GoalData; onUpdate: (data: GoalData) => void }) {
  const [statement, setStatement] = useState(data.statement || "");
  const [codename, setCodename] = useState(data.codename || "");
  const [showCodename, setShowCodename] = useState(!!data.codename);
  const [plan, setPlan] = useState(data.plan || []);

  const generatePlan = () => {
    if (!statement.trim()) return;
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
    <div className="space-y-3">
      <textarea
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        placeholder="What do you want to achieve?"
        className="w-full px-3 py-2 border rounded text-sm resize-none"
        rows={2}
      />
      {showCodename && (
        <input
          type="text"
          value={codename}
          onChange={(e) => setCodename(e.target.value)}
          placeholder="Give it a codename..."
          className="w-full px-3 py-2 border rounded text-sm"
        />
      )}
      {!showCodename && statement && (
        <button onClick={() => setShowCodename(true)} className="text-xs px-2 py-1" style={{ color: "#60a5fa" }}>
          + Codename
        </button>
      )}
      <button
        onClick={generatePlan}
        className="w-full py-2 rounded font-bold transition-all text-sm"
        style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}
      >
        🤖 Generate Plan
      </button>
      {plan.length > 0 && (
        <div className="space-y-2 text-xs border-t pt-2">
          {plan.map((phase, idx) => (
            <div key={idx} style={{ backgroundColor: "rgba(96, 165, 250, 0.1)" }} className="rounded p-2">
              <p className="font-bold">{phase.title}</p>
              <ul className="text-xs">
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

function StepsNode({ data, onUpdate }: { data: StepData; onUpdate: (data: StepData) => void }) {
  const [steps, setSteps] = useState(data.steps || []);
  const [newStep, setNewStep] = useState("");

  const addStep = async () => {
    if (!newStep.trim()) return;
    const newSteps = [...steps, { id: Date.now().toString(), title: newStep, duration: "", difficulty: "MEDIUM" as const, completed: false }];
    setSteps(newSteps);
    onUpdate({ steps: newSteps });
    setNewStep("");
  };

  const toggleComplete = (id: string) => {
    const updated = steps.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
    setSteps(updated);
    onUpdate({ steps: updated });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addStep()}
          placeholder="Add step..."
          className="flex-1 px-2 py-1 border rounded text-xs"
        />
        <button onClick={addStep} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}>
          +
        </button>
      </div>
      <div className="space-y-1">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2 p-2 text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.05)" }}>
            <input type="checkbox" checked={step.completed} onChange={() => toggleComplete(step.id)} />
            <span className={step.completed ? "line-through opacity-50" : ""}>{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrioritizeNode({ data, onUpdate }: { data: PriorityData; onUpdate: (data: PriorityData) => void }) {
  const [tasks, setTasks] = useState(data.tasks || []);
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    if (!newTask.trim()) return;
    const newTasks = [...tasks, { id: Date.now().toString(), title: newTask, priority: "MEDIUM" as const, completed: false }];
    setTasks(newTasks);
    onUpdate({ tasks: newTasks });
    setNewTask("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add priority..."
          className="flex-1 px-2 py-1 border rounded text-xs"
        />
        <button onClick={addTask} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}>
          +
        </button>
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <div key={task.id} className="p-2 text-xs rounded" style={{ backgroundColor: "rgba(96, 165, 250, 0.05)" }}>
            <p className="font-semibold">{task.title}</p>
            <p className="text-xs opacity-75">Priority: {task.priority}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodoNode({ data, onUpdate }: { data: TodoData; onUpdate: (data: TodoData) => void }) {
  const [todos, setTodos] = useState(data.todos || []);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    const newTodos = [...todos, { id: Date.now().toString(), title: newTodo, completed: false, time: "", note: "", postponed: 0 }];
    setTodos(newTodos);
    onUpdate({ todos: newTodos });
    setNewTodo("");
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTodos(updated);
    onUpdate({ todos: updated });
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add task..."
          className="flex-1 px-2 py-1 border rounded text-xs"
        />
        <button onClick={addTodo} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}>
          +
        </button>
      </div>
      <p className="text-xs text-center">{completedCount}/{todos.length} ({progress}%)</p>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {todos.map((todo) => (
          <div key={todo.id} className="flex items-center gap-2 p-1 text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.05)" }}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
            <span className={todo.completed ? "line-through opacity-50" : "flex-1"}>{todo.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiaryNode({ data, onUpdate }: { data: DiaryData; onUpdate: (data: DiaryData) => void }) {
  const [entries, setEntries] = useState(data.entries || []);
  const [text, setText] = useState("");
  const [mood, setMood] = useState("");

  const addEntry = async () => {
    if (!text.trim()) return;
    const newEntries = [
      { id: Date.now().toString(), timestamp: new Date(), text, mood, tags: [] },
      ...entries,
    ];
    setEntries(newEntries);
    onUpdate({ entries: newEntries });
    setText("");
    setMood("");
  };

  return (
    <div className="space-y-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your thoughts..." className="w-full px-2 py-1 border rounded text-xs resize-none" rows={2} />
      <div className="flex gap-1">
        {["😊", "😐", "😢", "😴", "😤"].map((emoji) => (
          <button key={emoji} onClick={() => setMood(emoji)} className={`text-lg ${mood === emoji ? "opacity-100" : "opacity-50"}`}>
            {emoji}
          </button>
        ))}
      </div>
      <button onClick={addEntry} className="w-full py-1 rounded text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}>
        Save Entry
      </button>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {entries.slice(0, 3).map((entry) => (
          <div key={entry.id} className="p-2 text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.05)" }}>
            <p className="text-xs opacity-75">{entry.mood}</p>
            <p className="line-clamp-1">{entry.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourcesNode({ data, onUpdate }: { data: ResourceData; onUpdate: (data: ResourceData) => void }) {
  const [resources, setResources] = useState(data.resources || []);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"PODCAST" | "VIDEO" | "BOOK" | "WEBSITE" | "COURSE">("PODCAST");

  const addResource = async () => {
    if (!title.trim()) return;
    const newResources = [...resources, { id: Date.now().toString(), type, title, url: undefined, notes: "" }];
    setResources(newResources);
    onUpdate({ resources: newResources });
    setTitle("");
  };

  return (
    <div className="space-y-2">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title..." className="w-full px-2 py-1 border rounded text-xs" />
      <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-2 py-1 border rounded text-xs">
        <option>PODCAST</option>
        <option>VIDEO</option>
        <option>BOOK</option>
        <option>WEBSITE</option>
        <option>COURSE</option>
      </select>
      <button onClick={addResource} className="w-full py-1 rounded text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}>
        + Add
      </button>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {resources.map((res) => (
          <div key={res.id} className="p-2 text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.05)" }}>
            <p className="font-semibold">{res.title}</p>
            <p className="opacity-75">{res.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchlistNode({ data, onUpdate }: { data: WatchlistData; onUpdate: (data: WatchlistData) => void }) {
  const [items, setItems] = useState(data.items || []);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"MOVIE" | "SERIES" | "DOCUMENTARY">("MOVIE");

  const addItem = () => {
    if (!title.trim()) return;
    const newItems = [...items, { id: Date.now().toString(), type, title, status: "PLANNING" as const, watchWith: [], tags: [] }];
    setItems(newItems);
    onUpdate({ items: newItems });
    setTitle("");
  };

  return (
    <div className="space-y-2">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title..." className="w-full px-2 py-1 border rounded text-xs" />
      <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-2 py-1 border rounded text-xs">
        <option>MOVIE</option>
        <option>SERIES</option>
        <option>DOCUMENTARY</option>
      </select>
      <button onClick={addItem} className="w-full py-1 rounded text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}>
        + Add
      </button>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="p-2 text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.05)" }}>
            <p className="font-semibold">{item.title}</p>
            <p className="opacity-75">{item.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HopinNode({ data, onUpdate }: { data: HopinData; onUpdate: (data: HopinData) => void }) {
  const [plans, setPlans] = useState(data.plans || []);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [goal, setGoal] = useState("");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const addPlan = () => {
    if (!goal.trim()) return;
    const newPlans = [...plans, { id: Date.now().toString(), day: selectedDay, goal, habit: "", completed: false }];
    setPlans(newPlans);
    onUpdate({ plans: newPlans });
    setGoal("");
  };

  const dayPlans = plans.filter((p) => p.day === selectedDay);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-all ${selectedDay === day ? "opacity-100" : "opacity-50"}`}
            style={{ backgroundColor: selectedDay === day ? "rgba(96, 165, 250, 0.3)" : "transparent" }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>
      <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal..." className="w-full px-2 py-1 border rounded text-xs" />
      <button onClick={addPlan} className="w-full py-1 rounded text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}>
        + Add Plan
      </button>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {dayPlans.map((plan) => (
          <div key={plan.id} className="p-2 text-xs" style={{ backgroundColor: "rgba(96, 165, 250, 0.05)" }}>
            <p>{plan.goal}</p>
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const [nodes, setNodes] = useState<EssenzNodeData[]>([
    {
      id: "goal",
      type: "goal",
      title: "What's Your Goal?",
      icon: "🎯",
      position: { x: 5, y: 5 },
      expanded: true,
      data: {} as GoalData,
    },
    {
      id: "steps",
      type: "steps",
      title: "Break It Down",
      icon: "🪜",
      position: { x: 35, y: 5 },
      expanded: true,
      data: {} as StepData,
    },
    {
      id: "priorities",
      type: "prioritize",
      title: "Prioritize",
      icon: "📊",
      position: { x: 65, y: 5 },
      expanded: true,
      data: {} as PriorityData,
    },
    {
      id: "todo",
      type: "todo",
      title: "Today's Tasks",
      icon: "✅",
      position: { x: 5, y: 50 },
      expanded: false,
      data: {} as TodoData,
    },
    {
      id: "diary",
      type: "diary",
      title: "My Diary",
      icon: "📔",
      position: { x: 35, y: 50 },
      expanded: false,
      data: {} as DiaryData,
    },
    {
      id: "resources",
      type: "resources",
      title: "Tools & Resources",
      icon: "🔧",
      position: { x: 65, y: 50 },
      expanded: false,
      data: {} as ResourceData,
    },
    {
      id: "watchlist",
      type: "watchlist",
      title: "Watch Together",
      icon: "🎬",
      position: { x: 5, y: 95 },
      expanded: false,
      data: {} as WatchlistData,
    },
    {
      id: "hopin",
      type: "hopin",
      title: "This Week",
      icon: "📅",
      position: { x: 35, y: 95 },
      expanded: false,
      data: {} as HopinData,
    },
  ]);

  const categories = [
    { id: "goals", label: "Goals", icon: "🎯" },
    { id: "steps", label: "Steps", icon: "🪜" },
    { id: "priorities", label: "Priorities", icon: "📊" },
    { id: "todos", label: "Todos", icon: "✅" },
    { id: "diary", label: "Diary", icon: "📔" },
    { id: "resources", label: "Resources", icon: "🔧" },
    { id: "watchlist", label: "Watchlist", icon: "🎬" },
    { id: "hopin", label: "This Week", icon: "📅" },
  ];

  useEffect(() => {
    const loadEssenzData = async () => {
      try {
        await fetch("/api/essenz");
      } catch (err) {
        console.error("Failed to load essenz data:", err);
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
          <Link href="/join" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all">
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
    (id: string, data: any) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data } : n)));
    },
    []
  );

  const handleNodeDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNode(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleNodeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNode) return;

    const container = (e.target as HTMLElement).closest("[data-canvas]");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;

    setNodes((prev) =>
      prev.map((n) =>
        n.id === draggedNode
          ? { ...n, position: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } }
          : n
      )
    );
    setDraggedNode(null);
  };

  return (
    <>
      <style>{`
        textarea, input[type="text"], input[type="email"], input[type="number"], select {
          background-color: rgba(30, 41, 59, 0.8) !important;
          color: #e2e8f0 !important;
          border: 1px solid rgba(59, 130, 246, 0.4) !important;
          border-radius: 4px !important;
        }
        textarea:focus, input:focus, select:focus {
          background-color: rgba(30, 41, 59, 0.95) !important;
          border-color: #60a5fa !important;
          outline: none !important;
          box-shadow: 0 0 8px rgba(96, 165, 250, 0.3) !important;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>

      <div className="flex h-screen" style={{ backgroundColor: "#1a1a1a" }}>
        {/* LEFT SIDEBAR */}
        <div
          className="flex flex-col transition-all duration-300 border-r"
          style={{
            width: sidebarOpen ? "240px" : "60px",
            backgroundColor: "#0f0f0f",
            borderColor: "rgba(59, 130, 246, 0.1)",
          }}
        >
          <div className="p-3 border-b" style={{ borderColor: "rgba(59, 130, 246, 0.1)" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2" style={{ color: "#60a5fa" }}>
              ☰
            </button>
          </div>

          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-xs font-bold text-gray-600 px-2 mb-3">CATEGORIES</div>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className="w-full text-left px-3 py-2 rounded text-sm transition-all hover:bg-opacity-20"
                  style={{ color: "rgba(226, 232, 240, 0.7)" }}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MAIN CANVAS */}
        <div
          className="flex-1 relative overflow-auto"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(96, 165, 250, 0.08) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
            backgroundColor: "#000",
          }}
          data-canvas
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleNodeDrop}
        >
          <div className="relative" style={{ minHeight: "100%", minWidth: "100%" }}>
            {nodes.map((node) => (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleNodeDragStart(e, node.id)}
                className="absolute transition-all duration-200 rounded-lg border overflow-hidden"
                style={{
                  width: "320px",
                  left: `calc(${node.position.x}% - 160px)`,
                  top: `${node.position.y}%`,
                  backgroundColor: "rgba(15, 20, 25, 0.7)",
                  borderColor: "rgba(59, 130, 246, 0.3)",
                  backdropFilter: "blur(10px)",
                  boxShadow: draggedNode === node.id ? "0 0 20px rgba(96, 165, 250, 0.4)" : "0 4px 12px rgba(0, 0, 0, 0.3)",
                  cursor: "grab",
                }}
              >
                {/* Card Header */}
                <div
                  className="px-4 py-3 border-b flex items-center justify-between"
                  style={{
                    borderColor: "rgba(59, 130, 246, 0.2)",
                    backgroundColor: "rgba(59, 130, 246, 0.08)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{node.icon}</span>
                    <h3 className="font-semibold text-sm" style={{ color: "#60a5fa" }}>
                      {node.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => toggleNode(node.id)}
                    className="p-1 rounded transition-all text-xs"
                    style={{ color: "#60a5fa" }}
                  >
                    {node.expanded ? "▼" : "▶"}
                  </button>
                </div>

                {/* Card Content */}
                {node.expanded && (
                  <div className="px-4 py-3 text-sm" style={{ color: "rgba(226, 232, 240, 0.8)" }}>
                    {node.type === "goal" && <GoalNode data={node.data as GoalData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                    {node.type === "steps" && <StepsNode data={node.data as StepData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                    {node.type === "prioritize" && <PrioritizeNode data={node.data as PriorityData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                    {node.type === "todo" && <TodoNode data={node.data as TodoData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                    {node.type === "diary" && <DiaryNode data={node.data as DiaryData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                    {node.type === "resources" && <ResourcesNode data={node.data as ResourceData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                    {node.type === "watchlist" && <WatchlistNode data={node.data as WatchlistData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                    {node.type === "hopin" && <HopinNode data={node.data as HopinData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div
          className="w-64 border-l overflow-y-auto p-4 flex flex-col"
          style={{
            borderColor: "rgba(59, 130, 246, 0.1)",
            backgroundColor: "#0f0f0f",
          }}
        >
          <div className="space-y-4 flex-1">
            <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#60a5fa" }}>
                Overview
              </h3>
              <div className="space-y-1 text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                <div>Active Nodes: {nodes.filter((n) => n.expanded).length}</div>
                <div>Total Nodes: {nodes.length}</div>
              </div>
            </div>

            <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#60a5fa" }}>
                Tips
              </h3>
              <p className="text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                Drag cards to reposition. Click collapse/expand buttons to toggle content.
              </p>
            </div>
          </div>

          <Link
            href="/profile"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto"
            style={{ backgroundImage: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)" }}
          >
            {session.user?.name?.charAt(0) || "U"}
          </Link>
        </div>
      </div>
    </>
  );
}
