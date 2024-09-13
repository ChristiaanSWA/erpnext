frappe.ui.form.on("Quick Stock Balance", {
    setup: (frm) => {
        frm.set_query("item", () => {
            if (!(frm.doc.warehouse && frm.doc.date)) {
                frm.trigger("check_warehouse_and_date");
            }
        });
    },

    make_custom_stock_report_button: (frm) => {
        if (frm.doc.item) {
            frm.add_custom_button(__("Stock Balance Report"), () => {
                frappe.set_route("query-report", "Stock Balance", {
                    item_code: frm.doc.item,
                    warehouse: frm.doc.warehouse,
                });
            });
        }
    },

    refresh: (frm) => {
        frm.disable_save();
        frm.trigger("make_custom_stock_report_button");
    },

    check_warehouse_and_date: (frm) => {
        frappe.msgprint(__("Please enter Warehouse and Date"));
        frm.doc.item = "";
        frm.refresh();
    },

    warehouse: (frm) => {
        if (frm.doc.item || frm.doc.item_barcode) {
            frm.trigger("get_stock_and_item_details");
        }
    },

    date: (frm) => {
        if (frm.doc.item || frm.doc.item_barcode) {
            frm.trigger("get_stock_and_item_details");
        }
    },

    item: (frm) => {
        frappe.flags.last_updated_element = "item";
        frm.trigger("get_stock_and_item_details");
        frm.trigger("make_custom_stock_report_button");
        frm.trigger("get_work_order_summary");
    },

    item_barcode: (frm) => {
        frappe.flags.last_updated_element = "item_barcode";
        frm.trigger("get_stock_and_item_details");
        frm.trigger("make_custom_stock_report_button");
    },

    get_stock_and_item_details: (frm) => {
        if (!(frm.doc.warehouse && frm.doc.date)) {
            frm.trigger("check_warehouse_and_date");
        } else if (frm.doc.item || frm.doc.item_barcode) {
            let filters = {
                warehouse: frm.doc.warehouse,
                date: frm.doc.date,
            };
            if (frappe.flags.last_updated_element === "item") {
                filters = { ...filters, ...{ item: frm.doc.item } };
            } else {
                filters = { ...filters, ...{ barcode: frm.doc.item_barcode } };
            }
            frappe.call({
                method: "erpnext.stock.doctype.quick_stock_balance.quick_stock_balance.get_stock_item_details",
                args: filters,
                callback: (r) => {
                    if (r.message) {
                        let fields = ["item", "qty", "value", "image"];
                        if (!r.message["barcodes"].includes(frm.doc.item_barcode)) {
                            frm.doc.item_barcode = "";
                            frm.refresh();
                        }
                        fields.forEach(function (field) {
                            frm.set_value(field, r.message[field]);
                        });
                        
                        // Setup table for stock details
                        let stock_details = r.message.stock_details;
                        let table_html = '<table class="table table-bordered"><thead><tr><th>Warehouse</th><th>Available Quantity</th></tr></thead><tbody>';
                        stock_details.forEach(detail => {
                            table_html += `<tr><td>${detail.warehouse}</td><td>${detail.actual_qty}</td></tr>`;
                        });
                        table_html += '</tbody></table>';
                        frm.fields_dict["stock_details_area"].$wrapper.html(table_html);
                    }
                },
            });
        }
    },

    get_work_order_summary: (frm) => {
        if (frm.doc.item) {
            frappe.call({
                method: "erpnext.stock.doctype.quick_stock_balance.quick_stock_balance.get_work_order_summary",
                args: { item_code: frm.doc.item },
                callback: (r) => {
                    if (r.message) {
                        let work_order_table = `<table class="table table-bordered">
                                                    <thead>
                                                        <tr><th>ID</th><th>Status</th><th>Qty To Manufacture</th><th>Production Item</th></tr>
                                                    </thead><tbody>`;
                        r.message.forEach(order => {
                            work_order_table += `<tr>
                                                    <td>${order.name}</td>
                                                    <td>${order.status}</td>
                                                    <td>${order.qty}</td>
                                                    <td>${order.production_item}</td>
                                                 </tr>`;
                        });
                        work_order_table += '</tbody></table>';
                        frm.fields_dict.work_order_summary_area.$wrapper.html(work_order_table);
                    }
                },
            });
        }
    }
});
