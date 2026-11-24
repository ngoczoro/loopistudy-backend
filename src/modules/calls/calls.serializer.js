/** `ParticipantInfo_State.DISCONNECTED` in the LiveKit protocol. */
const DISCONNECTED_STATE = 3;

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  try {
    const value = JSON.parse(metadata);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

/** Visible, still-connected participants. Hidden ones (load tests, recorders) are left out. */
export const activeParticipants = (participants = []) =>
  participants.filter(
    (participant) =>
      participant?.identity &&
      participant.state !== DISCONNECTED_STATE &&
      !participant.permission?.hidden,
  );

export const serializeParticipant = (participant) => {
  const joinedAtSeconds = Number(participant.joinedAt ?? 0);
  return {
    userId: participant.identity,
    fullName: participant.name || "Member",
    avatarUrl: parseMetadata(participant.metadata).avatarUrl ?? null,
    joinedAt: joinedAtSeconds > 0 ? new Date(joinedAtSeconds * 1000).toISOString() : null,
  };
};

export const buildCallStatus = (groupId, participants = []) => {
  const list = activeParticipants(participants).map(serializeParticipant);
  return {
    groupId,
    active: list.length > 0,
    count: list.length,
    participants: list,
  };
};
