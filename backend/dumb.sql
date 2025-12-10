<!DOCTYPE html>
<html lang="en" dir="ltr">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Export: quizup_db - postgres - Adminer</title>
<link rel="stylesheet" href="?file=default.css&amp;version=5.4.1">
<meta name='color-scheme' content='light'>
<script src='?file=functions.js&amp;version=5.4.1' nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ="></script>
<link rel='icon' href='data:image/gif;base64,R0lGODlhEAAQAJEAAAQCBPz+/PwCBAROZCH5BAEAAAAALAAAAAAQABAAAAI2hI+pGO1rmghihiUdvUBnZ3XBQA7f05mOak1RWXrNq5nQWHMKvuoJ37BhVEEfYxQzHjWQ5qIAADs='>
<link rel='apple-touch-icon' href='?file=logo.png&amp;version=5.4.1'>
<link rel='stylesheet' href='adminer.css?v=1260783384'>

<body class='ltr nojs adminer'>
<script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">mixin(document.body, {onkeydown: bodyKeydown, onclick: bodyClick});
document.body.classList.replace('nojs', 'js');
const offlineMessage = 'You are offline.';
const thousandsSeparator = ',';</script>
<div id='help' class='jush-pgsql jsonly hidden'></div>
<script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">mixin(qs('#help'), {onmouseover: () => { helpOpen = 1; }, onmouseout: helpMouseout});</script>
<div id='content'>
<span id='menuopen' class='jsonly'><button type='submit' name='' title='' class='icon icon-move'><span>menu</span></button></span><script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">qs('#menuopen').onclick = event => { qs('#foot').classList.toggle('foot'); event.stopPropagation(); }</script>
<p id="breadcrumb"><a href="?pgsql=postgres">PostgreSQL</a> » <a href='?pgsql=postgres&amp;username=quizup_user' accesskey='1' title='Alt+Shift+1'>postgres</a> » <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=">quizup_db</a> » <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public">public</a> » Export
<h2>Export: quizup_db</h2>
<div id='ajaxstatus' class='jsonly hidden'></div>

<form action="" method="post">
<table class="layout">
<tr><th>Output<td><label><input type='radio' name='output' value='text' checked>open</label><label><input type='radio' name='output' value='file'>save</label><label><input type='radio' name='output' value='gz'>gzip</label>
<tr><th>Format<td><label><input type='radio' name='format' value='sql' checked>SQL</label><label><input type='radio' name='format' value='csv'>CSV,</label><label><input type='radio' name='format' value='csv;'>CSV;</label><label><input type='radio' name='format' value='tsv'>TSV</label>
<tr><th>Database<td><select name='db_style'><option selected><option>USE<option>DROP+CREATE<option>CREATE</select><label><input type='checkbox' name='types' value='1'>User types</label><label><input type='checkbox' name='routines' value='1'>Routines</label><tr><th>Tables<td><select name='table_style'><option><option selected>DROP+CREATE<option>CREATE</select><label><input type='checkbox' name='auto_increment' value='1'>Auto Increment</label><label><input type='checkbox' name='triggers' value='1' checked>Triggers</label><tr><th>Data<td><select name='data_style'><option><option>TRUNCATE+INSERT<option selected>INSERT</select></table>
<p><input type="submit" value="Export">
<input type='hidden' name='token' value='250186:108169'>

<table>
<script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">qsl('table').onclick = dumpClick;</script>
<thead><tr><th style='text-align: left;'><label class='block'><input type='checkbox' id='check-tables'>Tables</label><script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">qs('#check-tables').onclick = partial(formCheck, /^tables\[/);</script><th style='text-align: right;'><label class='block'>Data<input type='checkbox' id='check-data'></label><script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">qs('#check-data').onclick = partial(formCheck, /^data\[/);</script></thead>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='categories'>categories</label><td align='right'><label class='block'><span id='Rows-categories'></span><input type='checkbox' name='data[]' value='categories'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='leaderboards'>leaderboards</label><td align='right'><label class='block'><span id='Rows-leaderboards'></span><input type='checkbox' name='data[]' value='leaderboards'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='match_players'>match_players</label><td align='right'><label class='block'><span id='Rows-match_players'></span><input type='checkbox' name='data[]' value='match_players'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='matches'>matches</label><td align='right'><label class='block'><span id='Rows-matches'></span><input type='checkbox' name='data[]' value='matches'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='question_bank_items'>question_bank_items</label><td align='right'><label class='block'><span id='Rows-question_bank_items'></span><input type='checkbox' name='data[]' value='question_bank_items'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='question_bank_options'>question_bank_options</label><td align='right'><label class='block'><span id='Rows-question_bank_options'></span><input type='checkbox' name='data[]' value='question_bank_options'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='quiz_attempt_answers'>quiz_attempt_answers</label><td align='right'><label class='block'><span id='Rows-quiz_attempt_answers'></span><input type='checkbox' name='data[]' value='quiz_attempt_answers'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='quiz_attempts'>quiz_attempts</label><td align='right'><label class='block'><span id='Rows-quiz_attempts'></span><input type='checkbox' name='data[]' value='quiz_attempts'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='quiz_questions'>quiz_questions</label><td align='right'><label class='block'><span id='Rows-quiz_questions'></span><input type='checkbox' name='data[]' value='quiz_questions'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='quizzes'>quizzes</label><td align='right'><label class='block'><span id='Rows-quizzes'></span><input type='checkbox' name='data[]' value='quizzes'></label>
<tr><td><label class='block'><input type='checkbox' name='tables[]' value='users' checked>users</label><td align='right'><label class='block'><span id='Rows-users'></span><input type='checkbox' name='data[]' value='users' checked></label>
<script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">ajaxSetHtml('?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&script=db');</script>
</table>
</form>
<p><a href='?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;dump=question%25'>question</a> <a href='?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;dump=quiz%25'>quiz</a></div>

<div id='foot' class='foot'>
<div id='menu'>
<h1><a href='https://www.adminer.org/' target="_blank" rel="noreferrer noopener" id='h1'><img src='?file=logo.png&amp;version=5.4.1' width='24' height='24' alt='' id='logo'>Adminer</a> <span class='version'>5.4.1 <a href='https://www.adminer.org/#download' target="_blank" rel="noreferrer noopener" id='version'></a></span></h1>
<form action='' method='post'>
<div id='lang'><label>Language: <select name='lang'><option value="en" selected>English<option value="ar">العربية<option value="bg">Български<option value="bn">বাংলা<option value="bs">Bosanski<option value="ca">Català<option value="cs">Čeština<option value="da">Dansk<option value="de">Deutsch<option value="el">Ελληνικά<option value="es">Español<option value="et">Eesti<option value="fa">فارسی<option value="fi">Suomi<option value="fr">Français<option value="gl">Galego<option value="he">עברית<option value="hi">हिन्दी<option value="hu">Magyar<option value="id">Bahasa Indonesia<option value="it">Italiano<option value="ja">日本語<option value="ka">ქართული<option value="ko">한국어<option value="lt">Lietuvių<option value="lv">Latviešu<option value="ms">Bahasa Melayu<option value="nl">Nederlands<option value="no">Norsk<option value="pl">Polski<option value="pt">Português<option value="pt-br">Português (Brazil)<option value="ro">Limba Română<option value="ru">Русский<option value="sk">Slovenčina<option value="sl">Slovenski<option value="sr">Српски<option value="sv">Svenska<option value="ta">த‌மிழ்<option value="th">ภาษาไทย<option value="tr">Türkçe<option value="uk">Українська<option value="uz">Oʻzbekcha<option value="vi">Tiếng Việt<option value="zh">简体中文<option value="zh-tw">繁體中文</select><script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">qsl('select').onchange = function () { this.form.submit(); };</script></label> <input type='submit' value='Use' class='hidden'>
<input type='hidden' name='token' value='782781:624254'>
</div>
</form>
<script src='?file=jush.js&amp;version=5.4.1' nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=" defer></script>
<script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">
var jushLinks = { pgsql:{
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&table=$&": /\b(categories|leaderboards|match_players|matches|question_bank_items|question_bank_options|quiz_attempt_answers|quiz_attempts|quiz_questions|quizzes|users)\b/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=update_updated_at_column_16750&name=$&": /\bupdate_updated_at_column(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_generate_v1_16391&name=$&": /\buuid_generate_v1(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_generate_v1mc_16392&name=$&": /\buuid_generate_v1mc(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_generate_v3_16393&name=$&": /\buuid_generate_v3(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_generate_v4_16394&name=$&": /\buuid_generate_v4(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_generate_v5_16395&name=$&": /\buuid_generate_v5(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_nil_16386&name=$&": /\buuid_nil(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_ns_dns_16387&name=$&": /\buuid_ns_dns(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_ns_oid_16389&name=$&": /\buuid_ns_oid(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_ns_url_16388&name=$&": /\buuid_ns_url(?=["`]?\()/g,
	"?pgsql=postgres&username=quizup_user&db=quizup_db&ns=public&function=uuid_ns_x500_16390&name=$&": /\buuid_ns_x500(?=["`]?\()/g
}
};
jushLinks.bac = jushLinks.pgsql;
jushLinks.bra = jushLinks.pgsql;
jushLinks.sqlite_quo = jushLinks.pgsql;
jushLinks.mssql_bra = jushLinks.pgsql;
</script>
<script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">syntaxHighlighting('15', '');</script>
<form action=''>
<p id='dbs'>
<input type='hidden' name='pgsql' value='postgres'>
<input type='hidden' name='username' value='quizup_user'>
<label title='Database'>DB: <select name='db'><option value=""><option>postgres<option selected>quizup_db<option>template1</select><script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">mixin(qsl('select'), {onmousedown: dbMouseDown, onchange: dbChange});</script>
</label><input type='submit' value='Use' class='hidden'>
<br><label>Schema: <select name='ns'><option value=""><option>information_schema<option>pg_catalog<option>pg_toast<option selected>public</select><script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">mixin(qsl('select'), {onmousedown: dbMouseDown, onchange: dbChange});</script>
</label><input type='hidden' name='dump' value=''>
</p></form>
<p class='links'>
<a href='?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;sql='>SQL command</a>
<a href='?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;import='>Import</a>
<a href='?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;dump=' id='dump' class='active '>Export</a>
<a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;create=">Create table</a>
<ul id='tables'><script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">mixin(qs('#tables'), {onmouseover: menuOver, onmouseout: menuOut});</script>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=categories" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=categories" class='structure' title='Show structure'>categories</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=leaderboards" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=leaderboards" class='structure' title='Show structure'>leaderboards</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=match_players" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=match_players" class='structure' title='Show structure'>match_players</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=matches" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=matches" class='structure' title='Show structure'>matches</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=question_bank_items" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=question_bank_items" class='structure' title='Show structure'>question_bank_items</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=question_bank_options" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=question_bank_options" class='structure' title='Show structure'>question_bank_options</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=quiz_attempt_answers" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=quiz_attempt_answers" class='structure' title='Show structure'>quiz_attempt_answers</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=quiz_attempts" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=quiz_attempts" class='structure' title='Show structure'>quiz_attempts</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=quiz_questions" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=quiz_questions" class='structure' title='Show structure'>quiz_questions</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=quizzes" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=quizzes" class='structure' title='Show structure'>quizzes</a>
<li><a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;select=users" class='select' title='Select data'>select</a> <a href="?pgsql=postgres&amp;username=quizup_user&amp;db=quizup_db&amp;ns=public&amp;table=users" class='structure' title='Show structure'>users</a>
</ul>
</div>
<form action="" method="post">
<p class="logout">
<span>quizup_user
</span>
<input type="submit" name="logout" value="Logout" id="logout">
<input type='hidden' name='token' value='113128:249387'>
</form>
</div>

<script nonce="NzczNTU3ZGRiYWYzMWFhMmFhYTVkMmViZjE5ZGI3ZmQ=">setupSubmitHighlight(document);</script>
