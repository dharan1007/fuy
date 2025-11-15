"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

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
  connections: string[];
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

interface HistoryEntry {
  id: string;
  timestamp: Date;
  category: string;
  action: string;
  data: any;
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
            {(todo.postponed ?? 0) > 0 && <span className="text-orange-400">⏱️ {todo.postponed}x</span>}
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
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'canvas'>('list');
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [connectionFrom, setConnectionFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<EssenzNodeData[]>([
    {
      id: "goal",
      type: "goal",
      title: "What's Your Goal?",
      icon: "[GOAL]",
      position: { x: 10, y: 10 },
      expanded: false,
      data: {} as GoalData,
      connections: [],
    },
    {
      id: "steps",
      type: "steps",
      title: "Break It Down",
      icon: "[STEPS]",
      position: { x: 40, y: 10 },
      expanded: false,
      data: {} as StepData,
      connections: [],
    },
    {
      id: "priorities",
      type: "prioritize",
      title: "Prioritize",
      icon: "[PRIORITY]",
      position: { x: 70, y: 10 },
      expanded: false,
      data: {} as PriorityData,
      connections: [],
    },
    {
      id: "todo",
      type: "todo",
      title: "Today's Tasks",
      icon: "[TODO]",
      position: { x: 10, y: 50 },
      expanded: false,
      data: {} as TodoData,
      connections: [],
    },
    {
      id: "diary",
      type: "diary",
      title: "My Diary",
      icon: "[DIARY]",
      position: { x: 40, y: 50 },
      expanded: false,
      data: {} as DiaryData,
      connections: [],
    },
    {
      id: "resources",
      type: "resources",
      title: "Tools & Resources",
      icon: "[TOOLS]",
      position: { x: 70, y: 50 },
      expanded: false,
      data: {} as ResourceData,
      connections: [],
    },
    {
      id: "watchlist",
      type: "watchlist",
      title: "Watch Together",
      icon: "[WATCH]",
      position: { x: 10, y: 90 },
      expanded: false,
      data: {} as WatchlistData,
      connections: [],
    },
    {
      id: "hopin",
      type: "hopin",
      title: "This Week",
      icon: "[WEEK]",
      position: { x: 40, y: 90 },
      expanded: false,
      data: {} as HopinData,
      connections: [],
    },
  ]);

  const categories = [
    { id: "goals", label: "Goals", icon: "[GOAL]", nodeId: "goal" },
    { id: "steps", label: "Steps", icon: "[STEPS]", nodeId: "steps" },
    { id: "priorities", label: "Priorities", icon: "[PRIORITY]", nodeId: "priorities" },
    { id: "todos", label: "Todos", icon: "[TODO]", nodeId: "todo" },
    { id: "diary", label: "Diary", icon: "[DIARY]", nodeId: "diary" },
    { id: "resources", label: "Resources", icon: "[TOOLS]", nodeId: "resources" },
    { id: "watchlist", label: "Watchlist", icon: "[WATCH]", nodeId: "watchlist" },
    { id: "hopin", label: "This Week", icon: "[WEEK]", nodeId: "hopin" },
  ];

  const nodeHasData = (node: EssenzNodeData) => {
    const data = node.data;
    if (node.type === "goal") return !!(data.statement || data.plan?.length);
    if (node.type === "steps") return !!(data.steps?.length);
    if (node.type === "prioritize") return !!(data.tasks?.length);
    if (node.type === "todo") return !!(data.todos?.length);
    if (node.type === "diary") return !!(data.entries?.length);
    if (node.type === "resources") return !!(data.resources?.length);
    if (node.type === "watchlist") return !!(data.items?.length);
    if (node.type === "hopin") return !!(data.plans?.length);
    return false;
  };

  const toggleNode = (id: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, expanded: !n.expanded } : n)));
    addHistory(nodes.find((n) => n.id === id)?.type || "", "toggled");
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    addHistory(nodes.find((n) => n.id === id)?.type || "", "removed");
  };

  const updateNodeData = useCallback(
    (id: string, data: any) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data } : n)));
      addHistory(nodes.find((n) => n.id === id)?.type || "", "updated");
    },
    [nodes]
  );

  const addHistory = (category: string, action: string) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      category,
      action,
      data: nodes,
    };
    setHistory((prev) => [...prev, entry]);
  };

  const handleNodeDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNode(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleNodeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNode || !canvasRef.current) return;

    const containerRect = canvasRef.current.getBoundingClientRect();
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

  const getPendingCount = () => {
    return nodes.reduce((count, node) => {
      if (node.type === "todo") {
        return count + (node.data.todos?.filter((t: any) => !t.completed).length || 0);
      }
      return count;
    }, 0);
  };

  const getPostponedCount = () => {
    return nodes.reduce((count, node) => {
      if (node.type === "todo") {
        return count + (node.data.todos?.filter((t: any) => (t.postponed ?? 0) > 0).length || 0);
      }
      return count;
    }, 0);
  };

  const getSuggestions = () => {
    const suggestions: string[] = [];
    const historyByCategory = new Map<string, number>();

    // Analyze history frequency
    history.forEach((entry) => {
      historyByCategory.set(
        entry.category,
        (historyByCategory.get(entry.category) || 0) + 1
      );
    });

    // Based on past activity
    if (history.length === 0) {
      suggestions.push("[NEW] Start with your first goal");
    } else {
      const mostActive = [...historyByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
      if (mostActive) {
        suggestions.push(`[ACTIVE] Most work on ${mostActive[0]}: ${mostActive[1]} changes`);
      }
    }

    // Node-specific suggestions
    nodes.forEach((node) => {
      if (node.type === "goal" && nodeHasData(node)) {
        const goalNode = node.data as GoalData;
        if (!goalNode.codename) {
          suggestions.push("[GOAL] Give your goal a codename");
        }
        if (!goalNode.plan || goalNode.plan.length === 0) {
          suggestions.push("[GOAL] Generate a plan using AI");
        }
      }

      if (node.type === "steps" && node.data.steps?.length > 0) {
        const steps = node.data.steps as any[];
        const uncompleted = steps.filter((s) => !s.completed).length;
        const completed = steps.filter((s) => s.completed).length;
        if (uncompleted > 0) {
          suggestions.push(`[STEPS] ${completed}/${steps.length} complete`);
        }
      }

      if (node.type === "prioritize" && node.data.tasks?.length > 0) {
        const tasks = node.data.tasks as any[];
        const critical = tasks.filter((t) => t.priority === "CRITICAL").length;
        if (critical > 0) {
          suggestions.push(`[PRIORITY] ${critical} critical tasks`);
        }
      }

      if (node.type === "todo" && node.data.todos?.length > 0) {
        const todos = node.data.todos as any[];
        const pending = todos.filter((t) => !t.completed).length;
        const postponed = todos.filter((t) => (t.postponed ?? 0) > 0).length;
        if (pending > 0) {
          suggestions.push(`[TODO] ${pending} tasks to complete`);
        }
        if (postponed > 0) {
          suggestions.push(`[TODO] ${postponed} tasks postponed`);
        }
      }

      if (node.type === "diary" && node.data.entries?.length > 0) {
        const entries = node.data.entries as any[];
        if (entries.length < 7) {
          suggestions.push(`[DIARY] Write ${7 - entries.length} more for full week`);
        }
      }

      if (node.type === "resources" && node.data.resources?.length > 0) {
        const resources = node.data.resources as any[];
        const unread = resources.filter((r) => !r.url).length;
        if (unread > 0) {
          suggestions.push(`[TOOLS] Add links to ${unread} resources`);
        }
      }

      if (node.type === "watchlist" && node.data.items?.length > 0) {
        const items = node.data.items as any[];
        const planning = items.filter((i) => i.status === "PLANNING").length;
        if (planning > 0) {
          suggestions.push(`[WATCH] Start ${planning} planned items`);
        }
      }

      if (node.type === "hopin" && node.data.plans?.length > 0) {
        const plans = node.data.plans as any[];
        const completed = plans.filter((p) => p.completed).length;
        suggestions.push(`[WEEK] ${completed}/${plans.length} week goals done`);
      }
    });

    return suggestions.slice(0, 5); // Return max 5 suggestions
  };

  const handleNodeClick = (nodeId: string) => {
    if (!drawingMode) return;

    if (!connectionFrom) {
      // Start new connection
      setConnectionFrom(nodeId);
    } else if (connectionFrom === nodeId) {
      // Cancel connection if clicking same node
      setConnectionFrom(null);
    } else {
      // Complete connection
      setNodes((prev) =>
        prev.map((n) =>
          n.id === connectionFrom
            ? {
                ...n,
                connections: n.connections.includes(nodeId)
                  ? n.connections
                  : [...n.connections, nodeId],
              }
            : n
        )
      );
      addHistory(nodes.find((n) => n.id === connectionFrom)?.type || "", "connected");
      setConnectionFrom(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode && connectionFrom && canvasRef.current) {
      const containerRect = canvasRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
      });
    }

    if (isPanning) {
      const deltaX = e.clientX - panStartPos.x;
      const deltaY = e.clientY - panStartPos.y;
      setPanX((prev) => prev + deltaX / zoom);
      setPanY((prev) => prev + deltaY / zoom);
      setPanStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      // Right click or Ctrl+Left click for panning
      setIsPanning(true);
      setPanStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setMobileView('list');
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show loading spinner while session is authenticating
  if (status === 'loading') {
    return <LoadingSpinner message="Loading Essenz..." />;
  }

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
        @media (max-width: 1023px) {
          .essenz-container {
            flex-direction: column;
          }
          .essenz-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100vh;
            max-width: 100%;
            background: rgba(15, 20, 25, 0.95) !important;
            z-index: 1000;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .essenz-sidebar.open {
            transform: translateX(0);
          }
          .essenz-main {
            width: 100%;
            height: 100%;
          }
          .essenz-right-panel {
            display: none;
          }
          .essenz-mobile-header {
            display: flex;
          }
        }
        @media (min-width: 1024px) {
          .essenz-mobile-header {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex h-screen essenz-container" style={{ backgroundColor: "#1a1a1a" }}>
        {/* MOBILE HEADER */}
        {isMobile && (
          <div className="essenz-mobile-header absolute top-0 left-0 right-0 h-16 bg-gray-900 border-b border-blue-500/20 items-center px-4 z-50 gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded text-blue-400 hover:bg-gray-800"
            >
              ☰ Menu
            </button>
            <div className="flex-1 flex gap-2">
              <button
                onClick={() => setMobileView('list')}
                className="px-3 py-1 rounded text-sm"
                style={{
                  backgroundColor: mobileView === 'list' ? 'rgba(96, 165, 250, 0.3)' : 'transparent',
                  color: mobileView === 'list' ? '#60a5fa' : 'rgba(226, 232, 240, 0.7)',
                }}
              >
                List
              </button>
              <button
                onClick={() => setMobileView('canvas')}
                className="px-3 py-1 rounded text-sm"
                style={{
                  backgroundColor: mobileView === 'canvas' ? 'rgba(96, 165, 250, 0.3)' : 'transparent',
                  color: mobileView === 'canvas' ? '#60a5fa' : 'rgba(226, 232, 240, 0.7)',
                }}
              >
                Canvas
              </button>
            </div>
          </div>
        )}

        {/* LEFT SIDEBAR */}
        <div
          className={`flex flex-col transition-all duration-300 border-r ${isMobile ? 'essenz-sidebar' : ''} ${isMobile && sidebarOpen ? 'open' : ''}`}
          style={{
            width: isMobile && sidebarOpen ? "100%" : (sidebarOpen ? "280px" : "60px"),
            backgroundColor: "#0f0f0f",
            borderColor: "rgba(59, 130, 246, 0.1)",
          }}
        >
          <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(59, 130, 246, 0.1)" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2" style={{ color: "#60a5fa" }}>
              [MENU]
            </button>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-red-400 hover:bg-gray-800 rounded" title="Close menu">
                ✕
              </button>
            )}
          </div>

          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Suggestions */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(96, 165, 250, 0.1)" }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>[INSIGHT] AI Suggestions</h3>
                <div className="space-y-1 text-xs" style={{ color: "rgba(226, 232, 240, 0.7)" }}>
                  {getSuggestions().length > 0 ? (
                    getSuggestions().map((s, i) => (
                      <div key={i} className="p-1 rounded" style={{ backgroundColor: "rgba(96, 165, 250, 0.05)" }}>
                        {s}
                      </div>
                    ))
                  ) : (
                    <p className="opacity-50">Start adding content...</p>
                  )}
                </div>
              </div>

              {/* Status Indicators */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(96, 165, 250, 0.1)" }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>[STATUS] Overview</h3>
                <div className="space-y-1 text-xs" style={{ color: "rgba(226, 232, 240, 0.7)" }}>
                  <div className="flex justify-between">
                    <span>[PENDING]</span>
                    <span style={{ color: "#60a5fa" }}>{getPendingCount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[POSTPONED]</span>
                    <span style={{ color: "#fbbf24" }}>{getPostponedCount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[HISTORY]</span>
                    <span style={{ color: "#a78bfa" }}>{history.length} events</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(96, 165, 250, 0.1)" }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>[STATS] Activity</h3>
                <div className="space-y-1 text-xs" style={{ color: "rgba(226, 232, 240, 0.7)" }}>
                  <div className="flex justify-between">
                    <span>[NODES]</span>
                    <span style={{ color: "#60a5fa" }}>{nodes.filter((n) => nodeHasData(n)).length}/8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[CONNECTIONS]</span>
                    <span style={{ color: "#a78bfa" }}>
                      {nodes.reduce((sum, n) => sum + n.connections.length, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div>
                <div className="text-xs font-bold text-gray-600 px-2 mb-2">[CATEGORIES]</div>
                {categories.map((cat) => {
                  const catNode = nodes.find((n) => n.id === cat.nodeId);
                  const hasData = catNode && nodeHasData(catNode);
                  const historyCount = history.filter((h) => h.category === cat.id).length;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <button
                        onClick={() => {
                          if (catNode) toggleNode(catNode.id);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm transition-all hover:bg-opacity-20"
                        style={{ color: hasData ? "#60a5fa" : "rgba(226, 232, 240, 0.7)" }}
                      >
                        <span className="mr-2 font-bold">{cat.icon}</span>
                        {cat.label}
                        {hasData && <span className="ml-1 text-xs" style={{ color: "#10b981" }}>[DATA]</span>}
                      </button>
                      <div className="text-xs px-3 space-y-1" style={{ color: "rgba(226, 232, 240, 0.5)" }}>
                        <Link
                          href={`/essenz/history/${cat.id}`}
                          className="block px-2 py-1 rounded transition-all hover:bg-opacity-20"
                          style={{ color: "rgba(226, 232, 240, 0.5)" }}
                        >
                          [HISTORY] {historyCount} changes
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MAIN CANVAS */}
        <div
          className="flex-1 relative overflow-auto flex flex-col essenz-main"
          style={{
            backgroundColor: "#000",
            paddingTop: isMobile ? "64px" : "0",
          }}
        >
          {/* MOBILE LIST VIEW */}
          {isMobile && mobileView === 'list' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div style={{ color: "rgba(226, 232, 240, 0.7)", fontSize: "12px", marginBottom: "16px", paddingLeft: "8px" }}>
                [NODES]
              </div>
              {nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => toggleNode(node.id)}
                  className="p-4 rounded-lg border cursor-pointer transition-all"
                  style={{
                    backgroundColor: "rgba(15, 20, 25, 0.7)",
                    borderColor: nodeHasData(node) ? "rgba(96, 165, 250, 0.5)" : "rgba(59, 130, 246, 0.3)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{node.icon}</span>
                      <h3 style={{ color: "#60a5fa", fontSize: "14px", fontWeight: "600", margin: 0 }}>
                        {node.title}
                      </h3>
                    </div>
                    <span style={{ color: "#60a5fa", fontSize: "12px" }}>
                      {node.expanded ? "[-]" : "[+]"}
                    </span>
                  </div>
                  {nodeHasData(node) && (
                    <div style={{ fontSize: "11px", color: "rgba(16, 185, 129, 1)", marginBottom: "8px" }}>
                      [DATA]
                    </div>
                  )}
                  {node.expanded && (
                    <div className="border-t border-blue-500/20 pt-3 mt-3">
                      <div style={{ color: "rgba(226, 232, 240, 0.8)", fontSize: "13px" }}>
                        {node.type === "goal" && <GoalNode data={node.data as GoalData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                        {node.type === "steps" && <StepsNode data={node.data as StepData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                        {node.type === "prioritize" && <PrioritizeNode data={node.data as PriorityData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                        {node.type === "todo" && <TodoNode data={node.data as TodoData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                        {node.type === "diary" && <DiaryNode data={node.data as DiaryData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                        {node.type === "resources" && <ResourcesNode data={node.data as ResourceData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                        {node.type === "watchlist" && <WatchlistNode data={node.data as WatchlistData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                        {node.type === "hopin" && <HopinNode data={node.data as HopinData} onUpdate={(data) => updateNodeData(node.id, data)} />}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CANVAS VIEW (DESKTOP & MOBILE CANVAS MODE) */}
          {(!isMobile || mobileView === 'canvas') && (
          <>
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-20 flex gap-2 p-2 rounded-lg" style={{ backgroundColor: "rgba(15, 20, 25, 0.8)" }}>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
              className="px-3 py-1 rounded text-xs font-bold"
              style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}
            >
              🔍+
            </button>
            <span className="px-2 py-1 text-xs" style={{ color: "#60a5fa" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
              className="px-3 py-1 rounded text-xs font-bold"
              style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}
            >
              🔍-
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
              }}
              className="px-3 py-1 rounded text-xs font-bold"
              style={{ backgroundColor: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}
            >
              ↺ Reset
            </button>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-auto"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(96, 165, 250, 0.08) 1px, transparent 1px)`,
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundColor: "#000",
              cursor: isPanning ? "grabbing" : drawingMode ? "crosshair" : "grab",
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleNodeDrop}
            onMouseMove={handleCanvasMouseMove}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              style={{
                minWidth: "200%",
                minHeight: "200%",
                transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                transformOrigin: "top left",
                transition: "transform 0.1s ease-out",
              }}
            >
              {/* Connection SVG */}
              <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
                {/* Existing connections */}
                {nodes.map((node) =>
                  node.connections.map((connId) => {
                    const targetNode = nodes.find((n) => n.id === connId);
                    if (!targetNode) return null;
                    const x1 = node.position.x * 10 + 160;
                    const y1 = node.position.y * 10 + 50;
                    const x2 = targetNode.position.x * 10 + 160;
                    const y2 = targetNode.position.y * 10 + 50;
                    return (
                      <line
                        key={`${node.id}-${connId}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#60a5fa"
                        strokeWidth="2"
                        opacity="0.4"
                      />
                    );
                  })
                )}

                {/* Drawing connection line */}
                {drawingMode && connectionFrom && (
                  <>
                    {(() => {
                      const sourceNode = nodes.find((n) => n.id === connectionFrom);
                      if (!sourceNode) return null;
                      const x1 = sourceNode.position.x * 10 + 160;
                      const y1 = sourceNode.position.y * 10 + 50;
                      return (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={mousePos.x}
                          y2={mousePos.y}
                          stroke="#fbbf24"
                          strokeWidth="2"
                          opacity="0.7"
                          strokeDasharray="5,5"
                        />
                      );
                    })()}
                  </>
                )}
              </svg>

              {/* Nodes */}
              {nodes
                .filter((node) => node.expanded || nodeHasData(node))
                .map((node) => {
                  const isSourceNode = drawingMode && connectionFrom === node.id;
                  return (
                    <div
                      key={node.id}
                      draggable={!drawingMode || !connectionFrom}
                      onClick={() => handleNodeClick(node.id)}
                      onDragStart={(e) => !drawingMode && handleNodeDragStart(e, node.id)}
                      className="absolute transition-all duration-200 rounded-lg border overflow-hidden"
                      style={{
                        width: "320px",
                        left: `${node.position.x * 10}px`,
                        top: `${node.position.y * 10}px`,
                        backgroundColor: isSourceNode ? "rgba(251, 191, 36, 0.1)" : "rgba(15, 20, 25, 0.7)",
                        borderColor: isSourceNode ? "rgba(251, 191, 36, 0.5)" : "rgba(59, 130, 246, 0.3)",
                        backdropFilter: "blur(10px)",
                        boxShadow:
                          isSourceNode
                            ? "0 0 20px rgba(251, 191, 36, 0.6)"
                            : draggedNode === node.id
                              ? "0 0 20px rgba(96, 165, 250, 0.4)"
                              : "0 4px 12px rgba(0, 0, 0, 0.3)",
                        cursor: drawingMode ? (isSourceNode ? "grabbing" : "pointer") : "grab",
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleNode(node.id)}
                          className="p-1 rounded transition-all text-xs font-bold"
                          style={{ color: "#60a5fa" }}
                        >
                          {node.expanded ? "[-]" : "[+]"}
                        </button>
                        <button
                          onClick={() => removeNode(node.id)}
                          className="p-1 rounded transition-all text-xs font-bold"
                          style={{ color: "#ff6b6b" }}
                        >
                          [X]
                        </button>
                      </div>
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
                  );
                })}
            </div>
          </div>
        </>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div
          className="w-64 border-l overflow-y-auto p-4 flex flex-col essenz-right-panel"
          style={{
            borderColor: "rgba(59, 130, 246, 0.1)",
            backgroundColor: "#0f0f0f",
          }}
        >
          <div className="space-y-4 flex-1">
            <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#60a5fa" }}>
                [CANVAS]
              </h3>
              <div className="space-y-1 text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                <div className="flex justify-between">
                  <span>[ZOOM]</span>
                  <span style={{ color: "#60a5fa" }}>{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>[ACTIVE]</span>
                  <span style={{ color: "#60a5fa" }}>{nodes.filter((n) => n.expanded || nodeHasData(n)).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>[CHANGES]</span>
                  <span style={{ color: "#a78bfa" }}>{history.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-3" style={{ backgroundColor: drawingMode ? "rgba(251, 191, 36, 0.15)" : "rgba(59, 130, 246, 0.1)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: drawingMode ? "#fbbf24" : "#60a5fa" }}>
                [CONNECT]
              </h3>
              <button
                onClick={() => {
                  setDrawingMode(!drawingMode);
                  setConnectionFrom(null);
                }}
                className="w-full py-2 rounded text-xs font-bold transition-all mb-2"
                style={{
                  backgroundColor: drawingMode ? "rgba(251, 191, 36, 0.3)" : "rgba(59, 130, 246, 0.2)",
                  color: drawingMode ? "#fbbf24" : "#60a5fa",
                  border: drawingMode ? "1px solid rgba(251, 191, 36, 0.5)" : "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                {drawingMode ? "[DRAWING] ON" : "[ENABLE] DRAW"}
              </button>
              <p className="text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                {drawingMode
                  ? "Click two nodes to connect. Right-click or Ctrl+drag to pan."
                  : "Enable drawing to create connections between nodes."}
              </p>
            </div>

            <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#60a5fa" }}>
                [GUIDE]
              </h3>
              <p className="text-xs" style={{ color: "rgba(226, 232, 240, 0.6)" }}>
                [DRAG] Move cards. [SCROLL] Zoom. [RCLICK] Pan canvas. [REMOVE] Delete nodes. [HISTORY] View changes.
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
