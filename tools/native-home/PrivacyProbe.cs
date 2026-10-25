// Read-only preference probe. Never calls adinfo_get_tifa or reads identifiers.
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text;
using System.Security.Cryptography;
class PrivacyProbe {
 [DllImport("libc")] static extern uint getuid();
 // Verified no-argument 0/1 return in this firmware's Thumb implementation.
 [DllImport("libadinfo.so", EntryPoint="adinfo_is_lat_enabled")]
 static extern int IsLimitAdTrackingEnabled();
 [DllImport("libadinfo.so", EntryPoint="_ZN19CHomeDataControlAPI11GetInstanceEv")]
 static extern IntPtr GetConsentApi();
 [DllImport("libadinfo.so", EntryPoint="_ZN19CHomeDataControlAPI26GetDisclaimerItemAgreementERKNSt7__cxx1112basic_stringIcSt11char_traitsIcESaIcEEEPiS5_")]
 static extern int GetAgreement(IntPtr instance, IntPtr group, ref int agreement, IntPtr category);
 // ARM32 GNU C++11 small-string layout verified in this library's call site.
 // Both arguments are const references, ASCII and <=15 bytes; no native ctor needed.
 static IntPtr SmallString(string value) {
  byte[] bytes=Encoding.ASCII.GetBytes(value);
  if(bytes.Length>15) throw new Exception("Probe string exceeds verified inline layout");
  IntPtr p=Marshal.AllocHGlobal(24);
  for(int i=0;i<24;i++) Marshal.WriteByte(p,i,0);
  Marshal.WriteIntPtr(p,0,IntPtr.Add(p,8));
  Marshal.WriteInt32(p,4,bytes.Length);
  for(int i=0;i<bytes.Length;i++) Marshal.WriteByte(p,8+i,bytes[i]);
  return p;
 }
 static int Main() {
  try {
   if(IntPtr.Size!=4 || getuid()!=901) throw new Exception("Expected 32-bit SDK user, no root");
   if(!File.ReadAllText("/etc/prd_info.ini").Contains("Version=T-KSU2ECAKUC-0080-2024.2;")) throw new Exception("Unexpected firmware");
   string libraryHash=Convert.ToHexString(SHA256.HashData(File.ReadAllBytes("/usr/lib/libadinfo.so"))).ToLowerInvariant();
   if(libraryHash!="e34c0886d38dd0351acfcfcd6381b1d90229a0c2d1be93eca5aafede95eaf2c3") throw new Exception("Advertising library differs from verified ABI; review required");
   int value=IsLimitAdTrackingEnabled();
   if(value!=0 && value!=1) throw new Exception("Unexpected preference return value");
   Console.WriteLine("PRIVACY_LAT_JSON="+JsonSerializer.Serialize(new{limitAdTrackingReported=value==1,uid=getuid(),note="Getter also defaults true if consent lookup fails; inspect PRIVACY_CONSENT_JSON for the actual lookup result."}));
   IntPtr group=IntPtr.Zero, category=IntPtr.Zero;
   try {
    group=SmallString("syncplus"); category=SmallString("TV");
    IntPtr api=GetConsentApi();
    if(api==IntPtr.Zero) throw new Exception("No consent API instance");
    int agreement=int.MinValue;
    int status=GetAgreement(api,group,ref agreement,category);
    Console.WriteLine("PRIVACY_CONSENT_JSON="+JsonSerializer.Serialize(new{item="syncplus",category="TV",status,agreement,readSucceeded=status>=0 && agreement!=int.MinValue}));
   } catch(Exception e) {Console.WriteLine("PRIVACY_CONSENT_ERROR="+e.GetType().Name+":"+e.Message);}
   finally {
    if(group!=IntPtr.Zero) Marshal.FreeHGlobal(group);
    if(category!=IntPtr.Zero) Marshal.FreeHGlobal(category);
   }
   return 0;
  } catch(Exception e) {Console.Error.WriteLine(e.GetType().Name+":"+e.Message);return 1;}
 }
}
