
import { prisma } from './prisma';

export const EMOTION_TAGS = {
    ANGRY: 'Angry',
    SAD: 'Sad',
    SURPRISED: 'Surprised'
};

const EMOTION_KEYWORDS = {
    [EMOTION_TAGS.ANGRY]: ['angry', 'mad', 'furious', 'annoyed', 'pissed', 'hate', 'stupid', 'ugh', 'quit', 'stop'],
    [EMOTION_TAGS.SAD]: ['sad', 'cry', 'upset', 'depressed', 'lonely', 'hurt', 'pain', 'sorry', 'miss', 'alone'],
    [EMOTION_TAGS.SURPRISED]: ['wow', 'whoa', 'omg', 'surprise', 'unbelievable', 'shock', 'really', 'wait', 'what'],
};

/**
 * Automatically analyze message content for emotional tags and triggers.
 */
export async function analyzeMessage(content: string, conversationId: string) {
    const tags: string[] = [];
    const normalizedContent = content.toLowerCase();

    // 1. Emotion Detection
    for (const [tag, keywords] of Object.entries(EMOTION_KEYWORDS)) {
        if (keywords.some(keyword => normalizedContent.includes(keyword))) {
            tags.push(tag);
        }
    }

    // 2. Trigger Detection (Programmable Memory)
    // In our system, triggers are stored in TriggerCollection -> Trigger.
    // The BondingDashboard creates them by tagging a message with a keyword.
    // We check if the current message matches any active trigger keywords in this conversation.

    // Fetch active triggers for this conversation
    const triggerCollections = await prisma.triggerCollection.findMany({
        where: { conversationId },
        include: { triggers: { where: { isActive: true } } }
    });

    const activeTriggers = triggerCollections.flatMap(c => c.triggers);
    const matchedTriggers = activeTriggers.filter(t => {
        if (t.conditionType === 'exact_match') {
            return normalizedContent === t.selectedText.toLowerCase();
        } else {
            return normalizedContent.includes(t.selectedText.toLowerCase());
        }
    });

    // If matches, we could add a special 'Trigger' tag or handle differently.
    // The user wants 'tags and triggers being analysed'.
    if (matchedTriggers.length > 0) {
        tags.push('Trigger');
    }

    return {
        tags,
        matchedTriggers
    };
}
