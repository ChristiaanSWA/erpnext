import frappe
from frappe import _
from frappe.model.document import Document
from erpnext.stock.utils import get_stock_balance, get_stock_value_on

class QuickStockBalance(Document):
    pass

@frappe.whitelist()
def get_stock_item_details(warehouse, date, item=None, barcode=None):
    out = {}
    if barcode:
        out["item"] = frappe.db.get_value("Item Barcode", filters={"barcode": barcode}, fieldname=["parent"])
        if not out["item"]:
            frappe.throw(_("Invalid Barcode. There is no Item attached to this barcode."))
    else:
        out["item"] = item

    barcodes = frappe.db.get_values("Item Barcode", filters={"parent": out["item"]}, fieldname=["barcode"])
    out["barcodes"] = [x[0] for x in barcodes]

    # Get quantity and warehouse details for all warehouses
    stock_balance = frappe.get_all('Bin', filters={'item_code': out['item']}, fields=['warehouse', 'actual_qty'])
    out["stock_details"] = stock_balance

    out["qty"] = get_stock_balance(out["item"], warehouse, date)
    out["value"] = get_stock_value_on(warehouse, date, out["item"])
    out["image"] = frappe.db.get_value("Item", filters={"name": out["item"]}, fieldname=["image"])
    return out

@frappe.whitelist()
def get_work_order_summary(item_code):
    work_orders = frappe.get_all(
        'Work Order', 
        filters={'production_item': item_code},
        fields=['name', 'status', 'qty', 'production_item']  # Removed 'serial_no'
    )
    return work_orders
