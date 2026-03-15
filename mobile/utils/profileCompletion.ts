// Profile completion score calculator
// Used to render the completion ring on the own profile avatar

export interface CompletionTask {
    label: string;
    done: boolean;
    points: number;
}

export interface CompletionResult {
    score: number;
    tasks: CompletionTask[];
}

export function getProfileCompletionScore(profile: Record<string, any>): CompletionResult {
    const tasks: CompletionTask[] = [
        {
            label: 'Upload a profile photo',
            done: !!profile?.avatarUrl,
            points: 15,
        },
        {
            label: 'Write a bio (20+ chars)',
            done: !!(profile?.bio && profile.bio.length > 20),
            points: 10,
        },
        {
            label: 'Add a cover image or video',
            done: !!(profile?.coverImageUrl || profile?.coverVideoUrl),
            points: 10,
        },
        {
            label: 'Add at least 2 tags',
            done: (() => {
                if (!profile?.tags) return false;
                const t = typeof profile.tags === 'string' ? profile.tags.split(',').filter(Boolean) : profile.tags;
                return Array.isArray(t) && t.length >= 2;
            })(),
            points: 10,
        },
        {
            label: 'Add 3+ Stalk Me images',
            done: (() => {
                if (!profile?.stalkMe) return false;
                let arr: string[] = [];
                try {
                    arr = typeof profile.stalkMe === 'string' ? JSON.parse(profile.stalkMe) : profile.stalkMe;
                } catch { arr = []; }
                return Array.isArray(arr) && arr.filter(Boolean).length >= 3;
            })(),
            points: 15,
        },
        {
            label: 'Set a current vibe',
            done: !!(profile?.current_vibe || profile?.currentVibe),
            points: 5,
        },
        {
            label: 'Fill in conversation starter',
            done: !!profile?.conversationStarter,
            points: 10,
        },
        {
            label: 'Add your city',
            done: !!profile?.city,
            points: 10,
        },
        {
            label: 'Add work history or education',
            done: !!(profile?.workHistory || profile?.education),
            points: 15,
        },
    ];

    const score = tasks.reduce((sum, t) => sum + (t.done ? t.points : 0), 0);
    return { score, tasks };
}
