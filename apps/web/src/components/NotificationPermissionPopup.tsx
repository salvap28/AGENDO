'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { askNotificationPermission, registerPushSubscription } from '@/lib/notifications';

export default function NotificationPermissionPopup() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Check if permission is 'default' (not asked yet)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            // Small delay to not be intrusive immediately on load
            const timer = setTimeout(() => setShow(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAllow = async () => {
        try {
            const perm = await askNotificationPermission();
            if (perm === 'granted') {
                const apiBase = window.location.origin;
                await registerPushSubscription(apiBase);
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
        } finally {
            setShow(false);
        }
    };

    const handleDismiss = () => {
        setShow(false);
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl shadow-2xl">
                        {/* Background effects */}
                        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />

                        <div className="relative z-10">
                            <h3 className="text-lg font-medium text-white mb-2">Activar notificaciones</h3>
                            <p className="text-sm text-white/70 mb-6 leading-relaxed">
                                Para que Agendo pueda avisarte cuando empiece un bloque de foco o sea momento de descansar.
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={handleDismiss}
                                    className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
                                >
                                    Ahora no
                                </button>
                                <button
                                    onClick={handleAllow}
                                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium text-white transition-all hover:scale-105 active:scale-95"
                                >
                                    Activar
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
