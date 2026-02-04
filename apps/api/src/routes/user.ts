import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireAuth } from '../routes/auth.js';

const router = Router();

const preferencesSchema = z.object({
    notifications: z.object({
        preBlockReminderMinutes: z.number().optional(),
        dailyCheckInReminderTime: z.string().optional(),
        nudgeStyle: z.enum(['soft', 'motivational', 'disciplined']).optional(),
    }).optional(),
});

router.put('/preferences', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).userId;
        const data = preferencesSchema.parse(req.body);

        // Get current preferences to merge
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true },
        });

        const currentPrefs = (user?.preferences as any) || {};

        // Deep merge logic simplified for this specific structure
        const newPrefs = {
            ...currentPrefs,
            ...data,
            notifications: {
                ...(currentPrefs.notifications || {}),
                ...(data.notifications || {}),
            },
        };

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                preferences: newPrefs,
            },
        });

        res.json({ ok: true, preferences: updatedUser.preferences });
    } catch (error) {
        console.error('[PUT /preferences] Error:', error);
        res.status(400).json({ ok: false, error: 'Invalid data or server error' });
    }
});

export default router;
