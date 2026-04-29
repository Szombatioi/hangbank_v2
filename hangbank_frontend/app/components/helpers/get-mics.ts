export const getMicrophones = async () => {
  // Permission
  await navigator.mediaDevices.getUserMedia({ audio: true });

  const devices = await navigator.mediaDevices.enumerateDevices();
  const microphones = devices.filter(device => device.kind === 'audioinput');

  return microphones; //{ deviceId, groupId, kind: 'audioinput', label }
};

export interface MicrophoneDetail{
    deviceId: string, 
    groupId: string, 
    kind: 'audioinput', 
    label: string,
}