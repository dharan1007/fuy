import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { X, Upload, FileText, Check, Plus, Trash2, Edit2 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { parseExcelFile, parseTextWorkout, ParsedExercise } from '../../lib/workoutParser';

interface WorkoutImportModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (exercises: ParsedExercise[]) => void;
}

type ImportMode = 'file' | 'text';

export default function WorkoutImportModal({ visible, onClose, onSave }: WorkoutImportModalProps) {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    const [activeMode, setActiveMode] = useState<ImportMode>('file');
    const [isLoading, setIsLoading] = useState(false);
    const [textInput, setTextInput] = useState("");
    const [parsedExercises, setParsedExercises] = useState<ParsedExercise[]>([]);
    const [previewMode, setPreviewMode] = useState(false);

    // Colors
    const colors = {
        background: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#111111' : '#F5F5F5',
        border: isDark ? '#333333' : '#E0E0E0',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#888888' : '#666666',
        accent: isDark ? '#FFFFFF' : '#000000',
        accentText: isDark ? '#000000' : '#FFFFFF',
        error: '#FF4444',
    };

    const handleFilePick = async () => {
        setIsLoading(true);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                setIsLoading(false);
                return;
            }

            const fileUri = result.assets[0].uri;
            const exercises = await parseExcelFile(fileUri);

            if (exercises.length === 0) {
                Alert.alert("No Exercises Found", "Could not parse any exercises from the file. Please check the format.");
            } else {
                setParsedExercises(exercises);
                setPreviewMode(true);
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Import Failed", "Failed to read the file. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTextParse = () => {
        if (!textInput.trim()) return;

        setIsLoading(true);
        // Small timeout to allow UI to show loading state
        setTimeout(() => {
            const exercises = parseTextWorkout(textInput);
            if (exercises.length === 0) {
                Alert.alert("No Exercises Found", "Could not identify exercises. Try format: 'Bench Press 3x10 100kg'");
            } else {
                setParsedExercises(exercises);
                setPreviewMode(true);
            }
            setIsLoading(false);
        }, 100);
    };

    const handleSave = () => {
        onSave(parsedExercises);
        resetState();
        onClose();
    };

    const resetState = () => {
        setParsedExercises([]);
        setTextInput("");
        setPreviewMode(false);
        setIsLoading(false);
    };

    const removeExercise = (index: number) => {
        const updated = [...parsedExercises];
        updated.splice(index, 1);
        setParsedExercises(updated);
        if (updated.length === 0) setPreviewMode(false);
    };

    const updateExercise = (index: number, field: keyof ParsedExercise, value: any) => {
        const updated = [...parsedExercises];
        updated[index] = { ...updated[index], [field]: value };
        setParsedExercises(updated);
    };

    // --- Renderers ---

    const renderHeader = () => (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Import Workout</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
                onPress={() => setActiveMode('file')}
                style={[styles.tab, activeMode === 'file' && { backgroundColor: colors.accent }]}
            >
                <Upload size={16} color={activeMode === 'file' ? colors.accentText : colors.textSecondary} />
                <Text style={[styles.tabText, { color: activeMode === 'file' ? colors.accentText : colors.textSecondary }]}>From Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => setActiveMode('text')}
                style={[styles.tab, activeMode === 'text' && { backgroundColor: colors.accent }]}
            >
                <FileText size={16} color={activeMode === 'text' ? colors.accentText : colors.textSecondary} />
                <Text style={[styles.tabText, { color: activeMode === 'text' ? colors.accentText : colors.textSecondary }]}>From Text</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFileTab = () => (
        <View style={styles.contentContainer}>
            <View style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Upload size={48} color={colors.textSecondary} />
                <Text style={[styles.uploadText, { color: colors.text }]}>Select Excel or CSV File</Text>
                <Text style={[styles.uploadSubtext, { color: colors.textSecondary }]}>
                    Supports standard headers like Name, Sets, Reps, Weight
                </Text>
                <TouchableOpacity onPress={handleFilePick} style={[styles.actionButton, { backgroundColor: colors.text }]}>
                    <Text style={[styles.actionButtonText, { color: colors.background }]}>Choose File</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTextTab = () => (
        <View style={styles.contentContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Paste Workout Text</Text>
            <TextInput
                multiline
                placeholder="Example:\nBench Press 3x10 100kg\nSquats 4 sets 12 reps\n..."
                placeholderTextColor={colors.textSecondary}
                value={textInput}
                onChangeText={setTextInput}
                style={[styles.textArea, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text
                }]}
            />
            <TouchableOpacity onPress={handleTextParse} style={[styles.actionButton, { backgroundColor: colors.text }]}>
                <Text style={[styles.actionButtonText, { color: colors.background }]}>Parse Text</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPreview = () => (
        <View style={styles.contentContainer}>
            <View style={styles.previewHeader}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>Preview ({parsedExercises.length})</Text>
                <TouchableOpacity onPress={resetState} style={styles.resetButton}>
                    <Text style={[styles.resetText, { color: colors.error }]}>Reset</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.listContainer}>
                {parsedExercises.map((ex, i) => (
                    <View key={i} style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <TextInput
                                value={ex.name}
                                onChangeText={(v) => updateExercise(i, 'name', v)}
                                style={[styles.inputName, { color: colors.text }]}
                            />
                            <TouchableOpacity onPress={() => removeExercise(i)}>
                                <Trash2 size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.cardRow}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sets</Text>
                                <TextInput
                                    value={String(ex.sets)}
                                    keyboardType="numeric"
                                    onChangeText={(v) => updateExercise(i, 'sets', parseInt(v) || 0)}
                                    style={[styles.inputSmall, { color: colors.text, borderColor: colors.border }]}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reps</Text>
                                <TextInput
                                    value={ex.reps}
                                    onChangeText={(v) => updateExercise(i, 'reps', v)}
                                    style={[styles.inputSmall, { color: colors.text, borderColor: colors.border }]}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight</Text>
                                <TextInput
                                    value={String(ex.weight)}
                                    keyboardType="numeric"
                                    onChangeText={(v) => updateExercise(i, 'weight', parseFloat(v) || 0)}
                                    style={[styles.inputSmall, { color: colors.text, borderColor: colors.border }]}
                                />
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>
            <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: colors.accent }]}>
                <Check size={20} color={colors.accentText} />
                <Text style={[styles.saveText, { color: colors.accentText }]}>Import {parsedExercises.length} Exercises</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.text} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Parsing...</Text>
                    </View>
                ) : (
                    <>
                        {!previewMode && renderTabs()}
                        {!previewMode && activeMode === 'file' && renderFileTab()}
                        {!previewMode && activeMode === 'text' && renderTextTab()}
                        {previewMode && renderPreview()}
                    </>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    tabs: {
        flexDirection: 'row',
        margin: 20,
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    tabText: {
        fontWeight: '700',
        fontSize: 14,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
    },
    uploadBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 24,
        gap: 16,
        marginBottom: 40,
    },
    uploadText: {
        fontSize: 18,
        fontWeight: '600',
    },
    uploadSubtext: {
        textAlign: 'center',
        paddingHorizontal: 40,
        fontSize: 12,
    },
    actionButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 32,
        marginTop: 16,
    },
    actionButtonText: {
        fontWeight: '700',
        fontSize: 16,
    },
    label: {
        marginBottom: 12,
        fontWeight: '600',
    },
    textArea: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        textAlignVertical: 'top',
        fontSize: 16,
        marginBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    resetButton: {
        padding: 8,
    },
    resetText: {
        fontWeight: '600',
    },
    listContainer: {
        flex: 1,
    },
    exerciseCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    inputName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    cardRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 10,
        marginBottom: 4,
    },
    inputSmall: {
        padding: 8,
        borderWidth: 1,
        borderRadius: 8,
        fontSize: 14,
        textAlign: 'center',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
        gap: 8,
    },
    saveText: {
        fontWeight: '700',
        fontSize: 16,
    },
});
