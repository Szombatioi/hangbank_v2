import { getMicrophones } from "@/app/components/helpers/get-mics";

/** Extracts the USB VID:PID from a browser device label, e.g. "(0d8c:0134)". */
function extractVidPid(label: string): string | null {
    const match = label.match(/\(([0-9a-f]{4}:[0-9a-f]{4})\)$/i);
    return match ? match[1] : null;
}

export type MicError = "not_found" | "permission_denied";

export interface MicResolution {
    deviceId: string | null;
    error: MicError | null;
}

/**
 * Finds the live deviceId for a microphone whose label was saved at project
 * creation time. Primary match: USB VID:PID (survives port changes, reboots).
 * Fallback: exact label match (macOS omits VID:PID from device labels).
 */
export async function resolveMicrophone(savedLabel: string): Promise<MicResolution> {
    try {
        const mics = await getMicrophones();
        const savedVidPid = extractVidPid(savedLabel);
        const matched = mics.find(m => {
            if (savedVidPid) {
                const liveVidPid = extractVidPid(m.label);
                if (liveVidPid === savedVidPid) return true;
            }
            return m.label === savedLabel;
        });
        return matched
            ? { deviceId: matched.deviceId, error: null }
            : { deviceId: null, error: "not_found" };
    } catch {
        return { deviceId: null, error: "permission_denied" };
    }
}
