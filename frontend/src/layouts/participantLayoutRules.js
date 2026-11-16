export const usesParticipantLayout = user => user?.role === 'USER';
export const isTakingAttempt = pathname => /^\/attempts\/[^/]+$/.test(pathname || '');
