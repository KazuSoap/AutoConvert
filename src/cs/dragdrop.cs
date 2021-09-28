using System;
using System.Runtime.InteropServices;
using System.Collections;
using System.Windows.Forms;
using System.Drawing;

namespace DragDrop
{
    [Guid("17DF9AAF-10AF-4917-A9E3-37609089120F")]
    [InterfaceType(ComInterfaceType.InterfaceIsIDispatch)]
    public interface DragDropEvents
    {
        [DispId(1)]
        void ControlDragDrop(ArrayList files);
        [DispId(2)]
        void ControlDragEnter();
        [DispId(3)]
        void ControlDragLeave();
        [DispId(4)]
        void ControlDragOver();
    }

    [ProgId("Rndomhack.DragDrop")]
    [ComSourceInterfaces(typeof(DragDropEvents))]
    [Guid("2C3CB66A-E52E-4e9a-97E4-03FF10887409")]
    public class DragDropComponent : Label
    {
        public DragDropComponent()
        {
            this.AllowDrop = true;
            this.AutoSize = false;
            this.Dock = DockStyle.Fill;
            this.TextAlign = ContentAlignment.MiddleCenter;
            this.Text = "Drag & Drop.";
            this.DragDrop += new DragEventHandler(this.TextBox_DragDrop);
            this.DragEnter += new DragEventHandler(this.TextBox_DragEnter);
            this.DragLeave += new EventHandler(this.TextBox_DragLeave);
            this.DragOver += new DragEventHandler(this.TextBox_DragOver);
        }

        public delegate void ControlDragDropEventHandler(ArrayList files);
        public delegate void ControlDragEnterEventHandler();
        public delegate void ControlDragLeaveEventHandler();
        public delegate void ControlDragOverEventHandler();

        public event ControlDragDropEventHandler ControlDragDrop;
        public event ControlDragEnterEventHandler ControlDragEnter;
        public event ControlDragLeaveEventHandler ControlDragLeave;
        public event ControlDragOverEventHandler ControlDragOver;

        public void SetText(string text)
        {
            this.Text = text;
        }

        public void SetFont(string name, string size, int color)
        {
            this.Font = new Font((name == null ? this.Font.Name : name), (size == null ? this.Font.SizeInPoints : float.Parse(size)));
            this.ForeColor = (Color.FromArgb(color));
        }

        private void TextBox_DragDrop(object sender, DragEventArgs e)
        {
            ArrayList files = new ArrayList((string[]) e.Data.GetData(DataFormats.FileDrop, false));
            if(ControlDragDrop != null)
            {
                ControlDragDrop(files);
            }
        }

        private void TextBox_DragEnter(object sender, DragEventArgs e)
        {
            e.Effect = DragDropEffects.All;
            if(ControlDragEnter != null)
            {
                ControlDragEnter();
            }
        }

        private void TextBox_DragLeave(object sender, EventArgs e)
        {
            if(ControlDragLeave != null)
            {
                ControlDragLeave();
            }
        }

        private void TextBox_DragOver(object sender, DragEventArgs e)
        {
            if(ControlDragOver != null)
            {
                ControlDragOver();
            }
        }
    }
}
