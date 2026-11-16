export const shouldWarnAttemptLeave = status => status === 'IN_PROGRESS';
export const preventAttemptUnload = (event, submitting) => {
 if (!submitting) return;
 event.preventDefault();
 event.returnValue = '';
};
