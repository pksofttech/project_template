import * as unity from "./unity.js";

window.member_check = member_check;
async function member_check() {
    function gen_table_info(table, data) {
        for (const d in data) {
            const row = table.insertRow(-1);
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            cell1.className = "w-1/3 font-bold text-xs text-base-content/60 bg-base-200/40 py-2 px-3 border-r border-base-content/10";
            cell2.className = "text-xs font-semibold py-2 px-3";
            cell1.innerHTML = d;
            cell2.innerHTML = data[d] !== null && data[d] !== undefined ? data[d] : "-";
        }
    }
    function gen_table_transaction(table, d) {
        const transaction = d.transaction;
        if (transaction) {
            const data = {};
            data.gate = transaction.GateWay.name;
            data.in_datetime = transaction.Log_Transaction.date_time;
            data.parked = d.parked;
            const in_images_paths = transaction.Log_Transaction.images_path ? transaction.Log_Transaction.images_path.split(",") : [];
            const image_div = in_images_paths.length >= 2 ? `
                        <div class="inline-flex gap-2">
                            <a href="${in_images_paths[0]}" target="_blank" class="block overflow-hidden rounded-box border border-base-content/10 shadow-xs"><img class="duration-300 ease-in-out rounded-box max-h-12 hover:scale-125 object-cover" src="${in_images_paths[0]}"> </a>
                            <a href="${in_images_paths[1]}" target="_blank" class="block overflow-hidden rounded-box border border-base-content/10 shadow-xs"><img class="duration-300 ease-in-out rounded-box max-h-12 hover:scale-125 object-cover" src="${in_images_paths[1]}"> </a>
                        </div>` : "-";
            data.images = image_div;
            for (const d in data) {
                const row = table.insertRow(-1);
                const cell1 = row.insertCell(0);
                const cell2 = row.insertCell(1);
                cell1.className = "w-1/3 font-bold text-xs text-base-content/60 bg-base-200/40 py-2 px-3 border-r border-base-content/10";
                cell2.className = "text-xs font-semibold py-2 px-3";
                cell1.innerHTML = d;
                cell2.innerHTML = data[d];
            }
        }
    }
    const card_id_input = document.getElementById("card_id_input").value;
    if (card_id_input) {
        const result_data = document.getElementById("result_data");
        result_data.innerHTML = "";
        const _reply = await unity.fetchApi(
            "/api/member/tools_permission_check?card_id=" + card_id_input,
            "get",
            null,
            "json"
        );

        if (_reply.success) {
            const data = _reply.data;
            unity.logger.info(data);
            const card_data = data.card_data;
            unity.logger.info(card_data);
            const Member = card_data.Member;
            const Member_User = card_data.Member_User;
            const Member_Type = card_data.Member_Type;
            const Member_User_Permission = card_data.Member_User_Permission;
            const temp = document.getElementById("template_content_member_info");
            const _c = temp.content.cloneNode(true);
            _c.querySelector('[name="card_info_msg"]').innerHTML = data.msg;
            if (data) {
                const table_transcation = _c.querySelector('[name="table_transcation"]');
                gen_table_transaction(table_transcation, data);
            }

            const table_member = _c.querySelector('[name="table_member"]');
            gen_table_info(table_member, Member);

            const table_member_user = _c.querySelector('[name="table_member_user"]');
            gen_table_info(table_member_user, Member_User);

            const table_member_type = _c.querySelector('[name="table_member_type"]');
            gen_table_info(table_member_type, Member_Type);

            const table_member_permission = _c.querySelector('[name="table_member_permission"]');
            gen_table_info(table_member_permission, Member_User_Permission);

            result_data.appendChild(_c);
        } else {
            unity.showDialogError({ msg: _reply.msg });
        }
    }
}

window.member_check_input_onkeypress = member_check_input_onkeypress;
function member_check_input_onkeypress(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        member_check();
    }
}

window.member_user_check = member_user_check;
async function member_user_check() {
    const member_user_input = document.getElementById("member_user_input").value;
    unity.logger.debug(member_user_input);
    if (member_user_input) {
        const result_data_member_user = document.getElementById("result_data_member_user");
        result_data_member_user.innerHTML = "";
        const _reply = await unity.fetchApi(
            "/api/member/tools_permission_check?member_user_name=" + member_user_input,
            "get",
            null,
            "json"
        );

        if (_reply.success) {
            const data = _reply.data;
            const Member_User = data.member_user.Member_User;
            const Member_User_Permission = data.member_user.Member_User_Permission;
            const members = data.members;
            // unity.logger.debug(Member_User);
            unity.logger.debug(Member_User_Permission);

            const temp = document.getElementById("template_content_member_user_info");
            const _c = temp.content.cloneNode(true);
            _c.querySelector('[data-field="pictureUrl"]').src = Member_User.pictureUrl;
            _c.querySelector('[data-field="name"]').innerHTML = Member_User.name;
            _c.querySelector('[data-field="id"]').innerHTML = Member_User.id;
            _c.querySelector('[data-field="address"]').innerHTML = Member_User.address;
            _c.querySelector('[data-field="status"]').innerHTML = Member_User.status;
            _c.querySelector('[data-field="expire_date_time"]').innerHTML = Member_User.expire_date_time;
            _c.querySelector('[data-field="remark"]').innerHTML = Member_User.remark;
            _c.querySelector('[data-field="permission_name"]').innerHTML = Member_User_Permission
                ? Member_User_Permission.name
                : "Unassigned";
            _c.querySelector('[data-field="permission_detail"]').innerHTML = Member_User_Permission
                ? Member_User_Permission.detail
                : "Unassigned";
            _c.querySelector('[data-field="permission_status"]').innerHTML = Member_User_Permission
                ? Member_User_Permission.status
                : "Unassigned";

            _c.querySelector('[data-field="card_count"]').innerHTML = members.length;

            if (members.length > 0) {
                const card_content = _c.querySelector('[data-field="card_content"]');
                const temp_01 = document.getElementById("template_content_card");
                members.forEach((e) => {
                    const Member = e.Member;
                    unity.logger.debug(Member);
                    const _c_01 = temp_01.content.cloneNode(true);
                    // _c_01.querySelector('[data-field="id"]').innerHTML = Member.id;
                    _c_01.querySelector('[data-field="card_id"]').innerHTML = Member.card_id;
                    _c_01.querySelector('[data-field="start_date_time"]').innerHTML = Member.start_date_time;
                    _c_01.querySelector('[data-field="expire_date_time"]').innerHTML = Member.expire_date_time;

                    card_content.appendChild(_c_01);
                });
            }

            result_data_member_user.appendChild(_c);
        } else {
            unity.showDialogError({ msg: _reply.msg });
        }
    }
}

window.member_user_check_input_onkeypress = member_user_check_input_onkeypress;
function member_user_check_input_onkeypress(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        member_user_check();
    }
}

// document.getElementById("member_user_input").value = "system_test";
