var util = require("josm/util");
var cmd = require("josm/command");
var layers = require("josm/layers");
var nb = require("josm/builder").NodeBuilder;
var activeLayer = layers.activeLayer;
util.assert(activeLayer != null, "No activeLayer!");
var ds = activeLayer.data;
var JOptionPane = javax.swing.JOptionPane;


function print_arr(arr, name) {
    for (var i=0; i<arr.length; i++) {
        util.println("{0}[{1}] = {2}", name, i, arr[i]);
    }
    if(arr.length==0)
        util.println("arr {0} empty", name);
}

//парсит строку вида "2:109-144" и возвращает теги подъезда
function get_tags(entr_string) {
    var entr = entr_string.split(":");
    var tags = {"entrance": "staircase"};
    if (entr[0] != "")
        tags["ref"] = entr[0];
    if (entr[1] != "")
        tags["addr:flats"] = entr[1];
    return tags;
}

function get_text_from_entrances(entrances) {
    var text = "";
    for (var i=0; i<entrances.length; i++) {
        var ref = entrances[i].get("ref");
        var flats = entrances[i].get("addr:flats");

        var line = "";
        if (typeof(ref)!="undefined")
            line+=ref;

        line+= ":";
        if (typeof(flats)!="undefined")
            line+=flats;

        line+="\n";

        text+=line;
    }
    return text;
}

function edit_entrances(nodes, arr_entr_str) {
    // var arr_entr_str = text.trim().split("\n");

    if(arr_entr_str.length != nodes.length) {
        JOptionPane.showMessageDialog(null, "Количество строк не соответствует количеству выделенных точек");
        return;
    }


    for (var i=0; i<nodes.length; i++) {
        var new_tags = get_tags(arr_entr_str[i]);

        //проверяем, изменились ли теги?

        var tags = Object.keys(new_tags);
        var isChanged = 0;
        for (var j=0; j<tags.length; j++) {
            // util.println("IsChanged j={0} tags={1} isChanged={2}",j,tags[j],isChanged);
            if(nodes[i].get(tags[j]) != new_tags[tags[j]])
                isChanged = 1;
        }

        util.println("Node i={0} isChanged={1}",i,isChanged);
        if(isChanged) {
		        activeLayer.apply(
			          cmd.change(nodes[i], {tags: new_tags})
		        );
        }
    }
}

function get_entrances_from_build(nodes, build) {
    var all_entrances = [nodes[0]];

    var neigs = build.getNeighbours(nodes[0]).toArray();
    var next_node; //получаем направление обхода (первого или второго соседа постоянно брать)
    if(neigs[0].id == nodes[1].id)
        next_node = 0;
    else if(neigs[1].id == nodes[1].id)
        next_node = 1;
    else
        util.assert(false, "Выделенные точки не соседние (нужно выделить здание, точку первого подъезда и соседнюю точку в сторону следующих подъездов)");

    var max = 100;
    var cur_node = nodes[1];
    var prev_node = nodes[0];
    while(max>0) {
        if(cur_node.id == nodes[0].id) //дошли до начальной точки
            break;

        if(cur_node.get("entrance") == "staircase")
            all_entrances.push(cur_node);

        neigs = build.getNeighbours(cur_node).toArray();


        util.println("Neig first={0} second={1}",neigs[0].id%1000,neigs[1].id%1000);

        if(neigs[0].id == prev_node.id) {
            prev_node = cur_node;
            cur_node = neigs[1];
        }
        else {
            prev_node = cur_node;
            cur_node = neigs[0];
        }

        max--;
    }

    return all_entrances;
}


function show_UI(nodes, f_edit,f_gen) {
    var JFrame = javax.swing.JFrame;
    var JButton = javax.swing.JButton;
    var JTextArea = javax.swing.JTextArea;
    var GroupLayout = javax.swing.GroupLayout;
    var JTextField = javax.swing.JTextField;
    var JLabel = javax.swing.JLabel;

    frame = new JFrame();
    frame.setTitle("Подъезды");

    var jt1 = new JTextField(nodes.length,2);
    jt1.setToolTipText("Кол-во подъездов");
    jt1.setEditable(false);
    var jt2 = new JTextField(1,2);
    jt2.setToolTipText("Начальный номер подъездов");
    var jt3 = new JTextField("36",3);
    jt3.setToolTipText("Кол-во квартир в каждом подъезде");
    var jt4 = new JTextField("1",3);
    jt4.setToolTipText("Начальный номер квартиры");

    // var ta = new JTextArea("1:1-36\n2:37-72");
    var text = get_text_from_entrances(nodes);
    var ta = new JTextArea(text);
    var button = new JButton("Создать");
    var b_gen = new JButton("Генерировать");

    button.addActionListener(function() {
        f_edit(nodes, ta.getText());
    });

    b_gen.addActionListener(function() {
        var new_text = f_gen(jt1.getText(),jt2.getText(),jt3.getText(),jt4.getText());
        ta.setText(new_text);
    });

    var layout = new GroupLayout(frame.getContentPane());
    frame.getContentPane().setLayout(layout);
    layout.setAutoCreateGaps(true);
    layout.setAutoCreateContainerGaps(true);

    layout.setHorizontalGroup(
        layout.createParallelGroup(GroupLayout.Alignment.TRAILING)
            .addGroup(
                layout.createSequentialGroup()
                    .addComponent(jt1, GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt2,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt3,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt4,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(b_gen)
            )
            .addComponent(ta)
            .addComponent(button)
    );

    layout.setVerticalGroup(
        layout.createSequentialGroup()
            .addGroup(
                layout.createParallelGroup(GroupLayout.Alignment.BASELINE)
                    .addComponent(jt1,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt2,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt3,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt4,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(b_gen))
            .addComponent(ta)
            .addComponent(button)
    );

    frame.pack();
    frame.setLocationRelativeTo(null);
    frame.getRootPane().setDefaultButton(b_gen);

    frame.setVisible(true);
    ta.requestFocus();
    ta.setCaretPosition(text.length-1);
}

function proc(nodes, text) {
    var arr = text.split("\n");
    var native_arr = new org.mozilla.javascript.NativeArray(arr);
    edit_entrances(nodes, native_arr);
}

function gen(entr_num,start_entr,flats_in_entr,start_flat) {
    var text = "";

    var cur_start_flat = Number(start_flat);
    flats_in_entr = Number(flats_in_entr);
    start_entr = Number(start_entr);

    for (var i=1; i<=entr_num; i++) {
        var cur_end_flat = cur_start_flat+flats_in_entr - 1;
        text = text +( i + start_entr - 1 )+":" + cur_start_flat +"-" + cur_end_flat ;
        if(i!=entr_num)
            text = text + "\n";
        cur_start_flat += flats_in_entr;
    }

    return text;
}

var nodes = ds.selection.nodes;
var nodes_len = nodes.length;
util.assert(nodes_len>0, "Нет выделенных точек");


var ways_len = ds.selection.ways.length;
util.assert(ways_len<2, "Выделено больше одной линии (должна быть только линия здания!)");

if(nodes_len == 2 && ways_len == 1) {
    var build = ds.selection.ways[0];
    util.assert(build.isArea(), "Выделенная линия не замкнутая (должно быть здание!)");
    util.assert(build.containsNode(nodes[0]), "Здание не содержит выделенную точку");
    util.assert(build.containsNode(nodes[1]), "Здание не содержит выделенную точку");
    util.assert(nodes[0].get("entrance")=="staircase", "Первая выделенная точка это не подъезд (нет тега entrance=staircase)");

    nodes = get_entrances_from_build(nodes, build);
}

show_UI(nodes, proc, gen);
