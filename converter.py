
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import pdfplumber
import pandas as pd
import os

class PDFToExcelConverter:
    def __init__(self, root):
        self.root = root
        self.root.title("Excelconverter | Desktop Engine")
        self.root.geometry("500x350")
        self.root.configure(bg="#0f172a") # Dark theme matching web app

        # Styling
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TButton", padding=10, font=('Inter', 10, 'bold'))
        
        self.setup_ui()

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

    def convert(self):
        pdf_file = self.pdf_path.get()
        save_path = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Excel Files", "*.xlsx")])
        
        if not save_path:
            return

        try:
            self.btn_convert.config(state="disabled", text="PROCESSING...")
            
            with pdfplumber.open(pdf_file) as pdf:
                # Use pd.ExcelWriter to handle multiple sheets
                with pd.ExcelWriter(save_path, engine='openpyxl') as writer:
                    total_pages = len(pdf.pages)
                    
                    for i, page in enumerate(pdf.pages):
                        # Extract tables
                        tables = page.extract_tables()
                        
                        if tables:
                            # If page has multiple tables, we combine them for simplicity
                            # or you could save them side-by-side. Here we concatenate.
                            dfs = [pd.DataFrame(table[1:], columns=table[0]) for table in tables if table]
                            if dfs:
                                final_df = pd.concat(dfs, ignore_index=True)
                                sheet_name = f"Page_{i+1}"
                                final_df.to_excel(writer, sheet_name=sheet_name, index=False)
                        
                        # Update progress bar
                        self.progress['value'] = ((i + 1) / total_pages) * 100
                        self.root.update_idletasks()

            messagebox.showinfo("Success", f"Data extracted successfully to:\n{save_path}")
            
        except Exception as e:
            messagebox.showerror("Engine Failure", f"An error occurred during extraction:\n{str(e)}")
        
        finally:
            self.btn_convert.config(state="normal", text="START EXTRACTION")
            self.progress['value'] = 0

if __name__ == "__main__":
    root = tk.Tk()
    app = PDFToExcelConverter(root)
    root.mainloop()
