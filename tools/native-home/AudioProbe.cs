// Read-only audio-route diagnostic. No mutation APIs or resident process.
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
class AudioProbe {
 [DllImport("libc")] static extern uint getuid();
 [DllImport("libcapi-media-sound-manager-tv.so.0", EntryPoint="sound_manager_get_speaker_selection")]
 static extern int GetTvSpeaker(ref int route);
 static int Main() {
  try {
   if(IntPtr.Size!=4 || getuid()!=901) throw new Exception("Expected 32-bit SDK user, no root");
   if(!File.ReadAllText("/etc/prd_info.ini").Contains("Version=T-KSU2ECAKUC-0080-2024.2;")) throw new Exception("Unexpected firmware");
   int route=int.MinValue;
   int status=GetTvSpeaker(ref route);
   Console.WriteLine("AUDIO_ROUTE_JSON="+JsonSerializer.Serialize(new{library="tv",status,route,uid=getuid()}));
   if(status!=0 || route==int.MinValue) throw new Exception("Selected route was not read successfully");
   return 0;
  } catch(Exception e) {Console.Error.WriteLine(e.GetType().Name+":"+e.Message);return 1;}
 }
}
