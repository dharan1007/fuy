import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, RefreshControl, Alert, Keyboard } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Check, Circle, Trash2, Clock, Link as LinkIcon, MoreHorizontal } from 'lucide-react-native';
import { TodoService } from '../services/CanvasService';

interface Todo {
    id: string;
    title: string;
    status: 'PENDING' | 'COMPLETED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: string;
}

export default function TasksScreen() {
    const { colors, mode } = useTheme();
    const router = useRouter();

    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [addingTask, setAddingTask] = useState(false);

    const fetchTodos = useCallback(async () => {
        try {
            const data = await TodoService.fetchTodos();
            setTodos(data);
        } catch (error) {
            console.error('Failed to fetch todos:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTodos();
    };

    const handleAddTask = async () => {
        if (!newTaskText.trim()) return;

        Keyboard.dismiss();
        const tempId = `temp-${Date.now()}`;
        const newTodo: Todo = {
            id: tempId,
            title: newTaskText.trim(),
            status: 'PENDING',
            priority: 'MEDIUM',
            createdAt: new Date().toISOString(),
        };

        // Optimistic update
        setTodos(prev => [newTodo, ...prev]);
        setNewTaskText('');
        setAddingTask(false);

        const result = await TodoService.createTodo(newTaskText.trim());
        if (result) {
            setTodos(prev => prev.map(t => t.id === tempId ? { ...t, id: result.id } : t));
        } else {
            // Revert on failure
            setTodos(prev => prev.filter(t => t.id !== tempId));
            Alert.alert('Error', 'Failed to create task');
        }
    };

    const handleToggle = async (todo: Todo) => {
        const newStatus = todo.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

        // Optimistic update
        setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: newStatus } : t));

        const result = await TodoService.updateTodo(todo.id, { status: newStatus });
        if (!result) {
            // Revert on failure
            setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: todo.status } : t));
        }
    };

    const handleDelete = async (id: string) => {
        const todoToDelete = todos.find(t => t.id === id);
        if (!todoToDelete) return;

        // Optimistic update
        setTodos(prev => prev.filter(t => t.id !== id));

        const success = await TodoService.deleteTodo(id);
        if (!success) {
            // Revert on failure
            setTodos(prev => [...prev, todoToDelete]);
            Alert.alert('Error', 'Failed to delete task');
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const groupedTodos = todos.reduce((acc, todo) => {
        const dateKey = formatDate(todo.createdAt);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(todo);
        return acc;
    }, {} as Record<string, Todo[]>);

    const sections = Object.entries(groupedTodos);

    const renderTask = (todo: Todo) => {
        const isCompleted = todo.status === 'COMPLETED';

        return (
            <TouchableOpacity
                key={todo.id}
                onPress={() => handleToggle(todo)}
                onLongPress={() => {
                    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(todo.id) },
                    ]);
                }}
                style={{
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                {/* Checkbox */}
                <View
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isCompleted ? (mode === 'dark' ? '#fff' : '#000') : (mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'),
                        backgroundColor: isCompleted ? (mode === 'dark' ? '#fff' : '#000') : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                    }}
                >
                    {isCompleted && <Check size={14} color={mode === 'dark' ? '#000' : '#fff'} />}
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: '600',
                            color: isCompleted ? (mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)') : colors.text,
                            textDecorationLine: isCompleted ? 'line-through' : 'none',
                        }}
                    >
                        {todo.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} color={mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                            <Text style={{ fontSize: 11, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                                {formatTime(todo.createdAt)}
                            </Text>
                        </View>
                        {todo.priority === 'HIGH' && (
                            <View style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text }}>HIGH</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Delete button */}
                <TouchableOpacity
                    onPress={() => handleDelete(todo.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: 4 }}
                >
                    <Trash2 size={18} color={mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: 'transparent',
                                borderWidth: 1,
                                borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ArrowLeft size={20} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>Tasks</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setAddingTask(true)}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Plus size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Add Task Input */}
                {addingTask && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'transparent',
                                borderWidth: 1,
                                borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                borderRadius: 16,
                                paddingHorizontal: 16,
                            }}
                        >
                            <TextInput
                                autoFocus
                                value={newTaskText}
                                onChangeText={setNewTaskText}
                                placeholder="What needs to be done?"
                                placeholderTextColor={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    fontSize: 15,
                                    color: colors.text,
                                }}
                                onSubmitEditing={handleAddTask}
                                returnKeyType="done"
                            />
                            <TouchableOpacity onPress={handleAddTask} style={{ padding: 8 }}>
                                <Check size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Task List */}
                <FlatList
                    data={sections}
                    keyExtractor={([date]) => date}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                    renderItem={({ item: [date, tasks] }) => (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', marginBottom: 12, letterSpacing: 0.5 }}>
                                {date.toUpperCase()}
                            </Text>
                            {tasks.map(renderTask)}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                            <Text style={{ fontSize: 16, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                                No tasks yet
                            </Text>
                            <Text style={{ fontSize: 14, color: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', marginTop: 4 }}>
                                Tap + to add your first task
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}
