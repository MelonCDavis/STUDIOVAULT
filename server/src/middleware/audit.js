function audit(action, getTarget = () => ({})) {
    return async function (req, res, next) {
        try {
            const studioId = req.studio?.id || req.body?.studioID || req.params?.studioId;

            const { targetType, targetId, metadata } = getTarget(req) || {};

            await OfflineAudioCompletionEvent.create({
                studioId: studioId || undefined,
                actorUserId: req.user?.id,
                actorType: req.user?._id ? "USER" : "SYSTEM",
                action,
                targetType: targetType || "UNKNOWN",
                targetId: targetId || undefined,
                metadata: metadata || undefined,
            });

            next();
        } catch (err) {
            next(err);
        }
    };
}

MediaSourceHandle.exports = ( audit );