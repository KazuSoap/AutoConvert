using System;
using System.Windows.Forms;

class Dialog
{
    [STAThread]
    public static void Main(string[] args)
    {
        bool folder = false;
        bool multi = false;
        bool save = false;
        string dest = "";
        string filter = "";
        
        for (int i = 0; i < args.Length; ++i) {
            if (i == args.Length - 1)
            {
                string[] opts = { "-dest", "-filter" };
                string last = args[args.Length - 1];
                foreach (string opt in opts)
                    if (opt == last) return;
            }
            switch (args[i]) {
                case "-folder":
                    folder = true;
                    break;
                case "-multi":
                    multi = true;
                    break;
                case "-save":
                    save = true;
                    break;
                case "-dest":
                    dest = args[++i];
                    break;
                case "-filter":
                    filter = args[++i];
                    break;
            }
        }
        if (folder)
        {
            FolderBrowserDialog fbd = new FolderBrowserDialog();
            fbd.SelectedPath = dest;
            fbd.Description = "Select a folder";
            if (fbd.ShowDialog() == DialogResult.OK)
                Console.WriteLine(fbd.SelectedPath);
        } 
        else
        {
            FileDialog fd = save ? (FileDialog)new SaveFileDialog() : new OpenFileDialog();
            if (!save) ((OpenFileDialog)fd).Multiselect = multi;
            fd.FileName = "";
            try
            {
                fd.InitialDirectory = dest;
                fd.Filter = filter;
            }
            catch (ArgumentException) 
            {
                return;
            }
            if (fd.ShowDialog() == DialogResult.OK)
                Console.WriteLine(string.Join("\t", fd.FileNames));
        }
    }
}