# Set the exe's own resources with plain Win32 calls (no rcedit, no external tools):
#   - application icon (RT_GROUP_ICON + RT_ICON) from an .ico
#   - version info (RT_VERSION) so Properties shows our product name
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/set-exe-resources.ps1 -Exe dist\aac.exe -Icon assets\app.ico
#
# Safe to run before UPX and before signing.

param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [string]$Icon = "assets\app.ico",
  [string]$ProductName = "example公司",
  [string]$FileDescription = "example公司 · 一键配置",
  [string]$CompanyName = "Example Company",
  [string]$Copyright = "© 2026 Example Company",
  [string]$FileVersion = "1.0.0.0",
  [string]$ProductVersion = "1.0.0.0",
  [string]$InternalName = "aac"
)

$ErrorActionPreference = "Stop"
$Exe = (Resolve-Path $Exe).Path
if ($Icon -and -not (Test-Path $Icon)) { $Icon = $null }

$cs = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public static class AacRes
{
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr BeginUpdateResource(string fileName, bool deleteExisting);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool UpdateResource(IntPtr h, IntPtr type, IntPtr name, ushort lang, byte[] data, int size);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool EndUpdateResource(IntPtr h, bool discard);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr LoadLibraryEx(string file, IntPtr h, uint flags);
    [DllImport("kernel32.dll")]
    static extern bool FreeLibrary(IntPtr h);
    delegate bool EnumLangProc(IntPtr hModule, IntPtr type, IntPtr name, ushort lang, IntPtr param);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool EnumResourceLanguages(IntPtr hModule, IntPtr type, IntPtr name, EnumLangProc cb, IntPtr param);

    // Replace the language block Windows already uses; adding lang 0 next to an
    // existing 0x409 leaves the shell reading the OLD resource.
    static List<ushort> LangsFor(string exe, int type, int name)
    {
        var list = new List<ushort>();
        IntPtr m = LoadLibraryEx(exe, IntPtr.Zero, 0x2);
        if (m == IntPtr.Zero) return list;
        var cb = new EnumLangProc(delegate(IntPtr h, IntPtr t, IntPtr n, ushort lang, IntPtr p)
        {
            list.Add(lang);
            return true;
        });
        try { EnumResourceLanguages(m, (IntPtr)type, (IntPtr)name, cb, IntPtr.Zero); }
        finally { FreeLibrary(m); }
        return list;
    }

    static ushort LangFor(string exe, int type, int name)
    {
        IntPtr m = LoadLibraryEx(exe, IntPtr.Zero, 0x2);   // LOAD_LIBRARY_AS_DATAFILE
        if (m == IntPtr.Zero) return 0;
        ushort found = 0;
        var cb = new EnumLangProc(delegate(IntPtr h, IntPtr t, IntPtr n, ushort lang, IntPtr p)
        {
            found = lang;
            return false;
        });
        try { EnumResourceLanguages(m, (IntPtr)type, (IntPtr)name, cb, IntPtr.Zero); }
        finally { FreeLibrary(m); }
        return found;
    }

    const int RT_ICON = 3;
    const int RT_GROUP_ICON = 14;
    const int RT_VERSION = 16;

    public static string SetAll(string exe, string ico, string product, string desc,
                                string company, string copyright, string fver, string pver, string internalName)
    {
        ushort iconLang = LangFor(exe, RT_GROUP_ICON, 1);
        var oldLangs = LangsFor(exe, RT_VERSION, 1);
        const ushort vlang = 0x0409;

        IntPtr h = BeginUpdateResource(exe, false);
        if (h == IntPtr.Zero) return "BeginUpdateResource failed: " + Marshal.GetLastWin32Error();

        try
        {
            if (ico != null && File.Exists(ico))
            {
                byte[] data = File.ReadAllBytes(ico);
                int count = BitConverter.ToUInt16(data, 4);
                var group = new List<byte>();
                group.AddRange(BitConverter.GetBytes((ushort)0));      // reserved
                group.AddRange(BitConverter.GetBytes((ushort)1));      // 1 = icon
                group.AddRange(BitConverter.GetBytes((ushort)count));

                var images = new List<byte[]>();
                for (int i = 0; i < count; i++)
                {
                    int off = 6 + i * 16;
                    int size = BitConverter.ToInt32(data, off + 8);
                    int dataOff = BitConverter.ToInt32(data, off + 12);
                    if (size <= 0 || dataOff + size > data.Length) continue;

                    byte[] img = new byte[size];
                    Array.Copy(data, dataOff, img, 0, size);
                    int id = images.Count + 1;
                    images.Add(img);

                    var e = new byte[14];
                    Array.Copy(data, off, e, 0, 12);                    // w,h,colors,reserved,planes,bpp,size
                    BitConverter.GetBytes((ushort)id).CopyTo(e, 12);    // nID
                    group.AddRange(e);

                    if (!UpdateResource(h, (IntPtr)RT_ICON, (IntPtr)id, iconLang, img, img.Length))
                        return "icon image " + id + " failed: " + Marshal.GetLastWin32Error();
                }

                byte[] g = group.ToArray();
                if (!UpdateResource(h, (IntPtr)RT_GROUP_ICON, (IntPtr)1, iconLang, g, g.Length))
                    return "icon group failed: " + Marshal.GetLastWin32Error();
            }

            byte[] ver = BuildVersion(product, desc, company, copyright, fver, pver, internalName);
            if (!UpdateResource(h, (IntPtr)RT_VERSION, (IntPtr)1, vlang, ver, ver.Length))
                return "version failed: " + Marshal.GetLastWin32Error();

            // drop other language copies so the shell cannot pick an old one
            foreach (ushort l in oldLangs)
                if (l != vlang) UpdateResource(h, (IntPtr)RT_VERSION, (IntPtr)1, l, null, 0);

            return "ok";
        }
        finally
        {
            EndUpdateResource(h, false);
        }
    }

    // ---- VS_VERSIONINFO ----

    static byte[] BuildVersion(string product, string desc, string company, string copyright,
                               string fver, string pver, string internalName)
    {
        var strings = new List<byte[]>();
        strings.Add(Str("CompanyName", company));
        strings.Add(Str("FileDescription", desc));
        strings.Add(Str("FileVersion", fver));
        strings.Add(Str("InternalName", internalName));
        strings.Add(Str("LegalCopyright", copyright));
        strings.Add(Str("OriginalFilename", Path.GetFileNameWithoutExtension(internalName) + ".exe"));
        strings.Add(Str("ProductName", product));
        strings.Add(Str("ProductVersion", pver));

        byte[] table = Block("040904B0", 1, 0, Concat(strings), null);
        byte[] stringFileInfo = Block("StringFileInfo", 1, 0, new List<byte>(), table);

        // VS_FIXEDFILEINFO
        var fixedInfo = new List<byte>();
        uint fms = (uint)((VerPart(fver, 0) << 16) | VerPart(fver, 1));
        uint fls = (uint)((VerPart(fver, 2) << 16) | VerPart(fver, 3));
        uint pms = (uint)((VerPart(pver, 0) << 16) | VerPart(pver, 1));
        uint pls = (uint)((VerPart(pver, 2) << 16) | VerPart(pver, 3));
        fixedInfo.AddRange(BitConverter.GetBytes(0xFEEF04BDu));
        fixedInfo.AddRange(BitConverter.GetBytes(0x00010000u));
        fixedInfo.AddRange(BitConverter.GetBytes(fms));
        fixedInfo.AddRange(BitConverter.GetBytes(fls));
        fixedInfo.AddRange(BitConverter.GetBytes(pms));
        fixedInfo.AddRange(BitConverter.GetBytes(pls));
        fixedInfo.AddRange(BitConverter.GetBytes(0x0000003Fu));
        fixedInfo.AddRange(BitConverter.GetBytes(0u));
        fixedInfo.AddRange(BitConverter.GetBytes(0x00040004u));
        fixedInfo.AddRange(BitConverter.GetBytes(1u));
        fixedInfo.AddRange(BitConverter.GetBytes(0u));
        fixedInfo.AddRange(BitConverter.GetBytes(0u));
        fixedInfo.AddRange(BitConverter.GetBytes(0u));

        // wValueLength here is the size of VS_FIXEDFILEINFO (52), per docs.
        return Block("VS_VERSION_INFO", 0, 52, fixedInfo, stringFileInfo);   // wType 0 for binary
    }

    static int VerPart(string v, int idx)
    {
        var parts = v.Split('.');
        if (idx < parts.Length)
        {
            int n;
            if (int.TryParse(parts[idx], out n)) return Math.Min(Math.Max(n, 0), 0xFFFF);
        }
        return 0;
    }

    // Blocks are aligned relative to the start of the block, and the block starts
    // after a 6-byte header, so padding must account for those 6 bytes.
    static void PadBlock(List<byte> buf)
    {
        while ((6 + buf.Count) % 4 != 0) buf.Add(0);
    }

    static byte[] Str(string key, string value)
    {
        var buf = new List<byte>();
        buf.AddRange(Encoding.Unicode.GetBytes(key));
        buf.AddRange(new byte[] { 0, 0 });                  // NUL
        PadBlock(buf);
        byte[] val = Encoding.Unicode.GetBytes(value);
        buf.AddRange(val);
        buf.AddRange(new byte[] { 0, 0 });
        PadBlock(buf);
        return Header(buf.Count, (val.Length / 2) + 1, 1, buf);
    }

    static List<byte> Concat(List<byte[]> parts)
    {
        var all = new List<byte>();
        foreach (var p in parts) all.AddRange(p);
        return all;
    }

    static byte[] Block(string key, int type, int valueLength, List<byte> value, byte[] child)
    {
        var body = new List<byte>();
        body.AddRange(Encoding.Unicode.GetBytes(key));
        body.AddRange(new byte[] { 0, 0 });
        PadBlock(body);
        if (value != null && value.Count > 0)
        {
            body.AddRange(value);
            PadBlock(body);
        }
        if (child != null) body.AddRange(child);
        return Header(body.Count, valueLength, type, body);
    }

    static byte[] Header(int bodyLen, int valueLength, int type, List<byte> body)
    {
        int total = bodyLen + 6;
        int padded = (total + 3) & ~3;          // wLength must include the padding
        var all = new List<byte>();
        all.AddRange(BitConverter.GetBytes((ushort)padded));
        all.AddRange(BitConverter.GetBytes((ushort)valueLength));
        all.AddRange(BitConverter.GetBytes((ushort)type));
        all.AddRange(body);
        while (all.Count < padded) all.Add(0);
        return all.ToArray();
    }
}
'@

Add-Type -TypeDefinition $cs -Language CSharp | Out-Null

$result = [AacRes]::SetAll($Exe, $Icon, $ProductName, $FileDescription, $CompanyName, $Copyright, $FileVersion, $ProductVersion, $InternalName)
if ($result -ne "ok") {
  Write-Error "resource update failed: $result"
  exit 1
}

$vi = (Get-Item $Exe).VersionInfo
Write-Host ("resources written -> {0} | {1} | {2}" -f $vi.ProductName, $vi.FileDescription, $vi.FileVersion)
