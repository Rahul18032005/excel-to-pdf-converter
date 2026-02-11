
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import pdfplumber
import pandas as pd
import os
import sys

class PDFToExcelConverter:
    def __init__(self, root):
        self.root = root
        self.root.title("Excelconverter | Desktop Engine")
        self.root.geometry("500x350")
        self.root.configure(bg="#0f172a")

        # Styling
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TButton", padding=10, font=('Inter', 10, 'bold'))
        
        self.setup_ui()
        print("--- EXCELCONVERTER ENGINE INITIALIZED ---")
        print("Ready for command. Select a PDF file to begin.")

    def setup_ui(self):
        # Header
        header = tk.Label(self.root, text="PDF to Excel Converter", font=('Inter', 18, 'bold'), 
                         bg="#0f172a", fg="#f97316", pady=20)
        header.pack()

        # File Selection Frame
        frame = tk.Frame(self.root, bg="#0f172a")
        frame.pack(pady=20)

        self.pdf_path = tk.StringVar(value="No file selected")
        tk.Label(frame, textvariable=self.pdf_path, wraplength=400, bg="#0f172a", fg="#94a3b8").pack()
        
        btn_select = tk.Button(frame, text="SELECT PDF FILE", command=self.select_file, 
                              bg="#f97316", fg="white", font=('Inter', 10, 'bold'), relief="flat", padx=20)
        btn_select.pack(pady=10)

        # Progress bar
        self.progress = ttk.Progressbar(self.root, orient="horizontal", length=300, mode="determinate")
        self.progress.pack(pady=20)

        # Convert Button
        self.btn_convert = tk.Button(self.root, text="START EXTRACTION", command=self.convert, 
                                   bg="#1e293b", fg="white", font=('Inter', 10, 'bold'), relief="flat", padx=40, state="disabled")
        self.btn_convert.pack(pady=10)

    def select_file(self):
        file_path = filedialog.askopenfilename(filetypes=[("PDF Files", "*.pdf")])
        if file_path:
            self.pdf_path.set(file_path)
            self.btn_convert.config(state="normal", bg="#f97316")
            print(f"FILE LOADED: {os.path.basename(file_path)}")

    def convert(self):
        pdf_file = self.pdf_path.get()
        save_path = filedialog.asksaveasfilename(defaultextension=".xlsx", 
                                               initialfile=os.path.basename(pdf_file).replace(".pdf", ""),
                                               filetypes=[("Excel Files", "*.xlsx")])
        
        if not save_path:
            print("CONVERSION ABORTED: No save path selected.")
            return

        print(f"EXTRACTION STARTED: Mapping data tracks from {os.path.basename(pdf_file)}...")
        
        try:
            self.btn_convert.config(state="disabled", text="PROCESSING...")
            
            with pdfplumber.open(pdf_file) as pdf:
                # Use pd.ExcelWriter to handle multiple sheets
                with pd.ExcelWriter(save_path, engine='openpyxl') as writer:
                    total_pages = len(pdf.pages)
                    
                    for i, page in enumerate(pdf.pages):
                        print(f"SCANNING PAGE {i+1}/{total_pages}...")
                        # Extract tables
                        tables = page.extract_tables()
                        
                        if tables:
                            # Concatenate tables on the same page
                            dfs = [pd.DataFrame(table[1:], columns=table[0]) for table in tables if table]
                            if dfs:
                                final_df = pd.concat(dfs, ignore_index=True)
                                sheet_name = f"Page_{i+1}"
                                final_df.to_excel(writer, sheet_name=sheet_name, index=False)
                        
                        # Update progress bar
                        self.progress['value'] = ((i + 1) / total_pages) * 100
                        self.root.update_idletasks()

            print(f"SUCCESS: Excel output generated at {save_path}")
            messagebox.showinfo("Success", f"Data extracted successfully to:\n{save_path}")
            
        except Exception as e:
            print(f"ENGINE FAILURE: {str(e)}")
            messagebox.showerror("Engine Failure", f"An error occurred during extraction:\n{str(e)}")
        
        finally:
            self.btn_convert.config(state="normal", text="START EXTRACTION")
            self.progress['value'] = 0

if __name__ == "__main__":
    # Ensure stdout is flushed for real-time terminal feedback
    sys.stdout.reconfigure(line_buffering=True)
    root = tk.Tk()
    app = PDFToExcelConverter(root)
    root.mainloop()
